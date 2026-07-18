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

async function main() {
  try {
    const kbPath = path.join(process.cwd(), '../knowledge-base.json');
    const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

    for (const entry of kbData) {
      console.log(`Processing topic: ${entry.topic}`);
      
      const content = `Topic: ${entry.topic}\nSource File: ${entry.source_file}\nSummary: ${entry.summary}\nSteps:\n${entry.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nKeywords: ${entry.keywords.join(', ')}`;
      
      const embeddingResponse = await genAI.models.embedContent({
        model: 'gemini-embedding-001',
        contents: content,
        config: {
          outputDimensionality: 768,
        }
      });
      
      const embedding = embeddingResponse.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error(`Failed to generate embedding for ${entry.topic}`);
      }

      const metadata = {
        topic: entry.topic,
        route: entry.route,
        source_file: entry.source_file,
      };

      // Delete existing entries for this route
      await supabase
        .from('kb_embeddings')
        .delete()
        .contains('metadata', { route: entry.route });

      // Insert new entry
      const { error } = await supabase
        .from('kb_embeddings')
        .insert({
          content,
          metadata,
          embedding
        });

      if (error) {
        console.error(`Error inserting ${entry.topic}:`, error);
      } else {
        console.log(`Successfully ingested: ${entry.topic}`);
      }
    }
    console.log('Knowledge Base ingestion complete.');
  } catch (error) {
    console.error('Ingestion failed:', error);
  }
}

main();
