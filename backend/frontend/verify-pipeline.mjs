import fs from 'fs';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const questions = [
  "how to do bill",
  "how to make bill",
  "raise an invoice",
  "cut a bill",
  "bill kaise banaye",
  "GST kaise add kare",
  "app lock kaise lagaye",
  "data nikaalna"
];

async function getQuota() {
  const ptDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const todayStr = ptDate.toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('gemini_quota_tracking')
    .select('requests')
    .eq('date', todayStr)
    .single();
  return data?.requests || 0;
}

async function main() {
  console.log('Starting verification pipeline...');
  const startQuota = await getQuota();
  console.log(`Initial Quota Used Today: ${startQuota}`);

  let buckets = {
    LOW: 0,
    ERRORS: 0,
    SUCCESS: 0
  };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\n[${i + 1}/${questions.length}] Q: "${q}"`);
    try {
      const response = await fetch('http://127.0.0.1:3000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, sessionId: 'test-session-456' })
      });
      
      if (!response.ok) {
         console.log("-> ERROR HTTP", response.status);
         buckets.ERRORS++;
         continue;
      }
      const data = await response.json();
      const reply = data.reply || "";
      
      if (reply.includes("I've reached my daily limit")) {
        console.log("-> ERROR: Reached daily limit!");
        buckets.ERRORS++;
      } else if (reply.includes("I don't have specific information on this")) {
        console.log("-> Result: LOW / FALLBACK");
        buckets.LOW++;
      } else {
        console.log("-> Result: Answered (Check Next.js console for exact bucket)");
        buckets.SUCCESS++; 
      }
      
    } catch (e) {
      console.error('Fetch error:', e.message);
      buckets.ERRORS++;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }

  const endQuota = await getQuota();
  const apiCallsUsed = endQuota - startQuota;

  console.log('\n==================================');
  console.log('VERIFICATION COMPLETE');
  console.log('==================================');
  console.log(`Total Gemini API Calls Used for Generation: ${apiCallsUsed}`);
  console.log(`Fallback (LOW): ${buckets.LOW}`);
  console.log(`Errors: ${buckets.ERRORS}`);
  console.log(`Successful Answers (Cache/High/Medium): ${buckets.SUCCESS}`);
}

main();
