import { createClient } from './supabase/client';

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder') &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

export const supabase = createClient();


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
