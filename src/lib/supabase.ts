import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[ShareSphere] Missing Supabase configuration.\n\n' +
    '  1. Copy  .env.example  →  .env.local\n' +
    '  2. Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n' +
    '  3. Restart the dev server.\n\n' +
    'Find your credentials at:\n' +
    '  Supabase Dashboard → Project Settings → API\n'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

