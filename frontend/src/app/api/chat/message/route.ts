import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import kbData from '../../../../data/knowledge-base.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// We will initialize Gemini inside the route handler to ensure fresh env vars

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let similarity = 0;
  let topMatch: any = null;
  try {
    const body = await request.json();
    const { message, sessionId, userId, language } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "I'm sorry, my AI backend is not configured yet (missing GEMINI_API_KEY)." }, { status: 500 });
    }
    const genAI = new GoogleGenAI({ apiKey });

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // 1. Quota Safeguard: Check current usage for today (Pacific Time)
    const ptDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const todayStr = ptDate.toISOString().split('T')[0];
    
    const { data: quotaData, error: quotaError } = await supabase
      .from('gemini_quota_tracking')
      .select('model_name, requests, input_tokens, output_tokens')
      .eq('date', todayStr);

    let totalRequests = 0;
    let modelUsage: Record<string, number> = {
      'gemini-2.5-flash-lite': 0,
      'gemini-2.5-flash': 0
    };
    
    if (quotaData) {
      for (const row of quotaData) {
        totalRequests += (row.requests || 0);
        modelUsage[row.model_name] = row.requests || 0;
      }
    }

    // Two models * 20 limit each = 40 total
    if (modelUsage['gemini-2.5-flash-lite'] >= 20 && modelUsage['gemini-2.5-flash'] >= 20) {
      return NextResponse.json({ 
        reply: "I've reached my daily limit of questions for today — please try again tomorrow, or click 'Talk to a human' to get help right now.", 
        route: null 
      });
    }

    // 2. Embed the original message (only ONE api call for embedding)
    let embedding = null;
    try {
      const embeddingResponse = await genAI.models.embedContent({
        model: 'gemini-embedding-001',
        contents: message,
        config: { outputDimensionality: 768 }
      });
      embedding = embeddingResponse.embeddings?.[0]?.values;
    } catch (e) {
      console.error("Embedding failed", e);
    }

    if (!embedding) {
       return NextResponse.json({ reply: "Sorry, I encountered an issue processing your message.", route: null });
    }

    // 3. Cache Check: Did we answer this very recently?
    const { data: cachedMatch, error: cacheError } = await supabase.rpc('match_chat_cache', {
      query_embedding: embedding,
      match_threshold: 0.90, // LOWERED threshold for better cache hit rate
      recent_days: 30,
    });

    if (!cacheError && cachedMatch && cachedMatch.length > 0) {
      let { reply, route } = cachedMatch[0];
      // Note: route might now be a JSON string of features, so we should attempt to parse it if needed,
      // but for legacy sake, if it's a stringified array we send it as features.
      let features = [];
      try {
        if (route && route.startsWith('[')) {
          features = JSON.parse(route);
        } else if (route) {
          // Fallback for old cache entries
          features = [{ name: 'Go to feature', route: route }];
        }
      } catch (e) {}

      // Save history and return immediately! 0 LLM calls!
      if (sessionId) {
        await supabase.from('chat_messages').insert([
          { session_id: sessionId, role: 'user', content: message },
          { session_id: sessionId, role: 'assistant', content: JSON.stringify({ reply, features }) }
        ]);
      }
      return NextResponse.json({ reply, features });
    }

    // 4. Vector search in Supabase using the match_kb_chunks RPC
    let kbContext = "";
    const { data: matchedChunks, error: matchError } = await supabase.rpc('match_kb_chunks', {
      query_embedding: embedding,
      match_threshold: 0.0,
      match_count: 3,
    });

    if (!matchError && matchedChunks && matchedChunks.length > 0) {
      topMatch = matchedChunks[0];
      similarity = topMatch.similarity || 0;
      kbContext = matchedChunks.map((c: any) => 
        `Route: ${c.metadata?.route || 'None'}\n${c.content}`
      ).join("\n\n");
    }

    if (similarity > 0.74) {
      // HIGH SIMILARITY: Skip Gemini, parse KB directly
      console.log("[BUCKET] HIGH - Zero API calls");
      
      const contentStr = topMatch.content || "";
      const summaryMatch = contentStr.match(/Summary:\s*([\s\S]*?)(?=\nSteps:|$)/);
      const stepsMatch = contentStr.match(/Steps:\n([\s\S]*?)(?=\nKeywords:|$)/);
      
      const summary = summaryMatch ? summaryMatch[1].trim() : "Here is the information you requested.";
      // Use direct short description instead of detailed steps
      const reply = summary;
      const features = topMatch.metadata?.route ? [{ name: topMatch.metadata.topic || 'Feature', route: topMatch.metadata.route }] : [];

      if (sessionId) {
        await supabase.from('chat_messages').insert([
          { session_id: sessionId, role: 'user', content: message },
          { session_id: sessionId, role: 'assistant', content: JSON.stringify({ reply, features }) }
        ]);
      }
      return NextResponse.json({ reply, features });
    }

    if (modelUsage['gemini-2.5-flash-lite'] + modelUsage['gemini-2.5-flash'] >= 38) {
      console.log("[BUCKET] MEDIUM (DEGRADED) - Zero API calls. Limit reached.");
      const reply = "I've almost reached my daily limit and don't have enough context to answer this accurately right now. Please click 'Talk to a human' for further assistance.";
      const features: any[] = [];
      if (sessionId) {
        await supabase.from('chat_messages').insert([
          { session_id: sessionId, role: 'user', content: message },
          { session_id: sessionId, role: 'assistant', content: JSON.stringify({ reply, features }) }
        ]);
      }
      return NextResponse.json({ reply, features });
    }

    console.log("[BUCKET] GLOBAL CONTEXT - 1 API call");
    
    // Load the FULL website logic as context instead of just local matches
    let globalKbContext = kbContext;
    try {
      globalKbContext = kbData.map((entry: any) => 
        `Topic: ${entry.topic}\nRoute: ${entry.route || 'None'}\nSummary: ${entry.summary}\nSteps:\n${(entry.steps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`
      ).join('\n\n---\n\n');
    } catch (e) {
      console.error("Failed to load global KB", e);
      // fallback to local kbContext if file read fails
      globalKbContext = kbContext;
    }

    // 5. Get User History (if sessionId provided)
    let historyContext = "";
    if (sessionId) {
      const { data: historyData } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(10);
      
      if (historyData && historyData.length > 0) {
        historyContext = historyData.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n");
      }
    }

    // 6. Construct Prompt
    const systemPrompt = `You are a helpful, professional Live Support Assistant for MakInvoices, an invoicing web app.
Your task is to answer user queries politely and accurately. You have been provided with the ENTIRE website logic below (Global Context).

CRITICAL INSTRUCTIONS:
1. Search through the entire provided Global Context to find the most relevant feature(s) for the user's question.
2. ONLY describe information that appears VERBATIM in the provided context.
3. If the user asks a specific question about a feature, you MUST provide a short, direct answer (1-2 sentences max) summarizing that feature. Do NOT provide a detailed list of steps.
4. IMPORTANT: If the user asks a broad or general question about the app (e.g., "What is this app?", "Tell me about the app", "What features do you have?", "I want to know about app"), you MUST provide a comprehensive overview explaining EVERY major feature listed in the Global Context. Do not restrict this overview to 1-2 sentences; explain the app fully to give them a complete understanding of all capabilities.
5. Never provide help regarding login, signup, or authentication, as the user is already logged in. If asked about these, politely explain that they are already authenticated.
6. If the query is genuinely outside the website logic (like account deletion, billing disputes, bugs), briefly acknowledge you can't help directly and suggest they click "Talk to a human".
7. Please reply in ${language === 'hi' ? 'Hindi' : language === 'hi-en' ? 'Hinglish (a conversational mix of Hindi and English)' : language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : language === 'de' ? 'German' : 'English'}, but maintain professional formatting (Markdown).

IMPORTANT: You MUST respond with a valid JSON object in the following format (and NOTHING ELSE, NO markdown codeblocks):
{
  "reply": "Your markdown formatted reply here...",
  "features": [
    { "name": "Exact topic name from context", "route": "/matching/route" }
  ]
}
If you use a specific Topic from the context to answer the question, you MUST include its 'Topic' name and 'Route' in the "features" array so the frontend can navigate the user there.

GLOBAL WEBSITE LOGIC CONTEXT:
${globalKbContext}

RECENT HISTORY:
${historyContext}
`;

    const modelsToTry = [
      'gemini-2.5-flash-lite', 
      'gemini-2.5-flash'
    ];
    let generateResponse: any = null;
    let lastError = null;

    let usedModel = '';
    for (const modelName of modelsToTry) {
      if (modelUsage[modelName] >= 20) {
        console.log(`Model ${modelName} is at its individual quota limit, skipping...`);
        continue;
      }
      try {
        console.log(`Attempting generation with model: ${modelName}`);
        generateResponse = await genAI.models.generateContent({
          model: modelName,
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: '{"reply": "Understood. I will answer the user\'s next message in JSON format accordingly.", "features": []}' }] },
            { role: 'user', parts: [{ text: message }] }
          ],
          config: {
            responseMimeType: "application/json",
          }
        });
        
        // Success! Break out of the loop
        console.log(`Successfully generated response using ${modelName}`);
        usedModel = modelName;
        break;
      } catch (err: any) {
        lastError = err;
        console.error(`Model ${modelName} failed:`, err.message);
        
        if (err.message && err.message.includes("429")) {
           console.log(`Rate limit or Quota exhausted for ${modelName}, falling back to next available model...`);
           continue;
        } else {
           // If it's a different error (e.g. invalid prompt, context too large), throw immediately
           throw err;
        }
      }
    }

    if (!generateResponse) {
       // All models failed or exhausted quota
       throw lastError;
    }

    const replyText = generateResponse.text;
    let reply = replyText;
    let features = [];
    try {
      const parsed = JSON.parse(replyText);
      reply = parsed.reply || replyText;
      features = parsed.features || [];
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
    }

    // 8. Quota Logging and Caching
    try {
      // Upsert quota tracking
      const inputTokens = generateResponse.usageMetadata?.promptTokenCount || 0;
      const outputTokens = generateResponse.usageMetadata?.candidatesTokenCount || 0;
      
      // Upsert tracking for the specific model
      const existingModelRow = quotaData?.find((r: any) => r.model_name === usedModel);
      
      const { error: upsertError } = await supabase
        .from('gemini_quota_tracking')
        .upsert({ 
          date: todayStr, 
          model_name: usedModel,
          requests: (existingModelRow?.requests || 0) + 1,
          input_tokens: (existingModelRow?.input_tokens || 0) + inputTokens,
          output_tokens: (existingModelRow?.output_tokens || 0) + outputTokens
        });
      
      if (upsertError) console.error("Quota tracking error", upsertError);

      // Save to chat cache
      if (reply) {
        await supabase.from('chat_cache').insert({
          query_embedding: embedding,
          reply: reply,
          route: JSON.stringify(features) // Store features array in the old route column to avoid migrations for now
        });
      }
    } catch (e) {
      console.error("Failed to update cache/quota:", e);
    }

    // 9. Save messages to Supabase if sessionId exists
    if (sessionId) {
      await supabase.from('chat_messages').insert([
        { session_id: sessionId, role: 'user', content: message },
        { session_id: sessionId, role: 'assistant', content: JSON.stringify({ reply, features }) }
      ]);
    }

    return NextResponse.json({ reply, features });

  } catch (err: any) {
    console.error("Chat API Error:", err);
    
    if (err.message && err.message.includes("429")) {
       // If we have a decent local match, serve it instead of failing!
       if (similarity >= 0.45 && topMatch) {
         console.log("[BUCKET] MEDIUM (QUOTA EXHAUSTED) - Serving local fallback!");
         const contentStr = topMatch.content || "";
         const summaryMatch = contentStr.match(/Summary:\s*([\s\S]*?)(?=\nSteps:|$)/);
         const stepsMatch = contentStr.match(/Steps:\n([\s\S]*?)(?=\nKeywords:|$)/);
         
         const summary = summaryMatch ? summaryMatch[1].trim() : "Here is the information you requested.";
         // Use direct short description instead of detailed steps
         const reply = summary;
         const features = topMatch.metadata?.route ? [{ name: topMatch.metadata.topic || 'Feature', route: topMatch.metadata.route }] : [];
         
         return NextResponse.json({ reply, features });
       }

       return NextResponse.json({ 
         reply: "I've reached my AI daily limit and am unable to answer right now. Please click 'Talk to a human' for further assistance.", 
         features: [] 
       });
    }

    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
