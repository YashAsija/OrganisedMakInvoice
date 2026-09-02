import { supabase as clientInstance } from '../supabaseClient';

export function createClient() {
  return clientInstance;
}
