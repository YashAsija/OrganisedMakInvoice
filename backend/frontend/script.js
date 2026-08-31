const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ncxtkcykoftdxwtxqjlx.supabase.co', 'sb_publishable_NsKKBZsOJspBfve2zbQ35A_fupYsVhM');
supabase.from('invoices').select('*').eq('status', 'draft').then(res => {
  if (res.error) console.error('Error:', res.error);
  else console.log('Drafts count:', res.data.length);
}).catch(console.error);
