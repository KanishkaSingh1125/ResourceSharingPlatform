import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase env not set');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error, count } = await supabase
    .from('resources')
    .select('*, organisations!inner!resources_org_id_fkey(name, slug, verification_status), resource_categories(name, slug, icon)', { count: 'exact' })
    .eq('publication_status', 'published')
    .eq('organisations.verification_status', 'approved')
    .limit(10);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Count:', count);
    console.log('Resources:', JSON.stringify(data, null, 2));
  }
}

main();
