import { createServerClient } from './supabase';

export async function getOrCreateUser(clerkId: string, email: string, name?: string) {
  const supabase = createServerClient();
  
  // Try to find existing user
  const { data: existing, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (existing) return existing;

  // Only proceed to insert if error was "row not found" (PGRST116)
  if (findError && findError.code !== 'PGRST116') {
    throw findError;
  }
  
  // Create new user
  const { data: created, error } = await supabase
    .from('users')
    .insert({ clerk_id: clerkId, email, name: name || email.split('@')[0] })
    .select()
    .single();
  
  if (error) throw error;
  return created;
}
