import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Lazy client — avoids module-level env reads that crash at import time
let _supabase: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Client-side Supabase instance (anon key). Created lazily on first access.
 */
export function supabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
    }
    _supabase = createClient<Database>(url, key);
  }
  return _supabase;
}

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be set');
  }

  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set; falling back to anon key. Server operations may fail due to RLS.');
    if (!anonKey) throw new Error('Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
    return createClient<Database>(supabaseUrl, anonKey);
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
