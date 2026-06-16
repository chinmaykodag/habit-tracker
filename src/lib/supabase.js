import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// True when the env vars are present (i.e. Supabase is configured).
export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);
