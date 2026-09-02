import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const q = "data nikaalna";
  console.log(`\nTesting Global Context with query: "${q}"`);
  
  try {
    const response = await fetch('http://127.0.0.1:3000/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q, sessionId: 'test-session-global' })
    });
    
    if (!response.ok) {
       console.log("-> ERROR HTTP", response.status);
       return;
    }
    const data = await response.json();
    console.log("\nResponse Received:");
    console.log("Reply:", data.reply);
    console.log("Features:", data.features);
    
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

main();
