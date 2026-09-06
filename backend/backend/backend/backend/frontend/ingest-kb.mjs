import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error('Missing required environment variables. Please check your .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  try {
    const kbPath = path.join(process.cwd(), 'src/data/knowledge-base.json');
    const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

    let successCount = 0;
    for (const entry of kbData) {
      console.log(`Processing topic: ${entry.topic}`);
      
      const content = `Topic: ${entry.topic}\nSource File: ${entry.source_file}\nSummary: ${entry.summary}\nSteps:\n${entry.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nKeywords: ${entry.keywords.join(', ')}`;
      
      let embedding = null;
      let retries = 3;
      while (retries > 0) {
        try {
          const embeddingResponse = await genAI.models.embedContent({
            model: 'gemini-embedding-001',
            contents: content,
            config: {
              outputDimensionality: 768,
            }
          });
          embedding = embeddingResponse.embeddings?.[0]?.values;
          break; // success
        } catch (err) {
          console.error(`Gemini API error for ${entry.topic}: ${err.message}`);
          if (err.message && err.message.includes('429')) {
             console.log(`Rate limited on ${entry.topic}, retrying in 5 seconds... (${retries} left)`);
             await sleep(5000);
             retries--;
          } else {
             break; // non-rate limit error
          }
        }
      }

      if (!embedding) {
        console.error(`Skipping ${entry.topic} due to failed embedding.`);
        continue;
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
        successCount++;
      }
      
      // Delay to avoid hitting rate limits too quickly
      await sleep(2000);
    }
    console.log(`Knowledge Base ingestion complete. Successfully ingested ${successCount}/${kbData.length} entries.`);
  } catch (error) {
    console.error('Ingestion failed:', error);
  }
}

main();
