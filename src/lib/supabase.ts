import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// We disable session persistence since Veyl is 100% anonymous and session-based
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

if (!isSupabaseConfigured()) {
  console.warn(
    '⚠️ Veyl Warning: Supabase environment variables are missing. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable backend real-time database operations.'
  );
}
