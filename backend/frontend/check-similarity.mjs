import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error('Missing required environment variables. Please check your .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// Simple cosine distance function (matches pgvector <=> operator)
function cosineDistance(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
}

async function main() {
  const query = "how to do bill";
  
  // Embed query
  const embeddingResponse = await genAI.models.embedContent({
    model: 'gemini-embedding-001',
    contents: query,
    config: { outputDimensionality: 768 }
  });
  const queryEmbedding = embeddingResponse.embeddings?.[0]?.values;

  if (!queryEmbedding) {
    console.error("Failed to embed query");
    return;
  }

  // Fetch all chunks from Supabase
  const { data, error } = await supabase.from('kb_embeddings').select('metadata, content, embedding');
  if (error) {
    console.error("DB error:", error);
    return;
  }

  // Calculate similarity manually to bypass schema cache issues!
  let bestScore = -1;
  let bestMatch = null;
  
  for (const chunk of data) {
    const dist = cosineDistance(queryEmbedding, chunk.embedding);
    const sim = 1 - dist;
    
    // Specifically log if it's the Invoices one
    if (chunk.metadata.topic === "Invoice Editor Modal" || chunk.metadata.route === "/quick-bill" || chunk.metadata.route === "/invoices") {
      console.log(`Similarity for Invoices (${chunk.metadata.topic}): ${sim}`);
    }

    if (sim > bestScore) {
      bestScore = sim;
      bestMatch = chunk;
    }
  }

  console.log(`\nBest Match Overall: ${bestMatch.metadata.topic} (Similarity: ${bestScore})`);
}

main();
