import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://placeholder.supabase.co'; // replaced at runtime by real env var

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-anon-key'; // replaced at runtime by real env var

/** True only when real Supabase credentials are configured */
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});


// --- Operation type enum (mirrors former Firebase enum) ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleSupabaseError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
