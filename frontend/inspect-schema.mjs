import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'company_settings' });
  if (error) {
    // If the RPC helper doesn't exist, we can query information_schema or just do a select on a dummy row
    console.log("RPC get_table_columns failed, attempting to select a dummy row...");
    const { data: selectData, error: selectError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    if (selectError) {
      console.error("Select error:", selectError);
    } else {
      console.log("Table columns (from keys):", Object.keys(selectData[0] || {}));
    }
  } else {
    console.log("Table columns:", data);
  }
}

main();
