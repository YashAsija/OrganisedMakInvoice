import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery(message) {
  console.log(`\n\n==========================================`);
  console.log(`(a) Raw Question: "${message}"`);
  
  // 1. Quota Safeguard: Check current usage for today (Pacific Time)
  const ptDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const todayStr = ptDate.toISOString().split('T')[0];
  
  const { data: quotaData, error: quotaError } = await supabase
    .from('gemini_quota_tracking')
    .select('requests')
    .eq('date', todayStr)
    .single();

  let currentRequests = quotaData?.requests || 0;

  if (currentRequests >= 1498) {
    console.log(`FINAL RESPONSE: I've reached my daily limit of questions for today — please try again tomorrow, or click 'Talk to a human' to get help right now.`);
    return;
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
     console.log(`FINAL RESPONSE: Sorry, I encountered an issue processing your message.`);
     return;
  }

  // 3. Cache Check: Did we answer this very recently?
  const { data: cachedMatch, error: cacheError } = await supabase.rpc('match_chat_cache', {
    query_embedding: embedding,
    match_threshold: 0.92,
    recent_days: 7,
  });

  if (!cacheError && cachedMatch && cachedMatch.length > 0) {
    const { reply, route } = cachedMatch[0];
    console.log(`(b) Cache hit!`);
    console.log(`FINAL RESPONSE: ${reply}`);
    return;
  }

  console.log(`(b) No cache hit. Proceeding to retrieval.`);

  // 4. Vector search in Supabase using the match_kb_chunks RPC
  let kbContext = "";
  const { data: matchedChunks, error: matchError } = await supabase.rpc('match_kb_chunks', {
    query_embedding: embedding,
    match_threshold: 0.65,
    match_count: 3,
  });

  console.log(`(c) Retrieved Chunks:`);
  if (matchError) {
    console.error("Match error:", matchError.message);
  } else if (matchedChunks && matchedChunks.length > 0) {
    matchedChunks.forEach((c, idx) => {
      console.log(`  [#${idx+1}] Score: ${c.similarity.toFixed(3)} | Route: ${c.metadata?.route}`);
    });
    kbContext = matchedChunks.map((c) => 
      `Route: ${c.metadata?.route || 'None'}\n${c.content}`
    ).join("\n\n");
  } else {
    console.log(`  [No chunks retrieved.]`);
  }

  // 5. Construct Prompt
  const systemPrompt = `You are a helpful, professional Live Support Assistant for MakInvoices, an invoicing web app.
Your task is to answer user queries politely and accurately, primarily relying on the provided Knowledge Base context and the user's recent chat history.

CRITICAL INSTRUCTIONS:
1. ONLY describe steps, button labels, and field names that appear VERBATIM in the provided context.
2. If the context doesn't specify an exact detail, speak in general terms rather than inventing specific labels. Never invent a button name, field name, or step that isn't in the given context.
3. If the retrieved context for a question is empty or low-confidence (meaning it doesn't really answer the user's question), you MUST NOT generate a plausible-sounding generic answer. You must say you don't have verified information and offer the "Talk to a Human" handoff.
4. If the query is genuinely outside the Knowledge Base (like account deletion, billing disputes, bugs), briefly acknowledge you can't help directly and suggest they click "Talk to a human".
5. Please reply in English, but maintain professional formatting (Markdown).

IMPORTANT: You MUST respond with a valid JSON object in the following format (and NOTHING ELSE, NO markdown codeblocks):
{
  "reply": "Your markdown formatted reply here...",
  "features": [
    { "name": "Exact feature name (e.g. Invoices, Templates)", "route": "/matching/route" }
  ]
}
If the Knowledge Base context provides Routes for matched topics, include them in the "features" array. If no feature is a confident match, return an empty array [].

KNOWLEDGE BASE:
${kbContext}

RECENT HISTORY:
`;

  console.log(`(d) Final Prompt Sent to Gemini:`);
  console.log(`--- BEGIN PROMPT ---`);
  console.log(systemPrompt);
  console.log(`--- END PROMPT ---`);
  
  // 6. Call Gemini 2.5 Flash
  try {
    const generateResponse = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: '{"reply": "Understood. I will answer the user\'s next message in JSON format accordingly.", "features": []}' }] },
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });
    
    console.log(`FINAL RESPONSE:`);
    console.log(generateResponse.text);

  } catch(e) {
    console.error(e);
  }
}

async function main() {
  const queries = [
    "how to make bill",
    "how to create an invoice",
    "how to change bill template",
    "how to customize invoice template",
    "how do I add tax or GST",
    "how do I export data",
    "how do I turn on PIN lock"
  ];

  for (const q of queries) {
    await testQuery(q);
  }
}

main();
