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
  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, name, publication_status, org_id, organisations(verification_status)')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) {
    console.error('Error fetching', error);
    process.exit(1);
  }
  console.log('Resources:', JSON.stringify(resources, null, 2));
}

main();
