import { supabase as clientInstance } from './supabaseClient';

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder') &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

export const supabase = clientInstance;

export { OperationType, handleSupabaseError } from './supabaseClient';
