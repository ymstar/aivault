import { auth } from '@clerk/nextjs/server';
import { createServerClient } from './supabase';

/**
 * Get the Supabase user UUID for the current Clerk user.
 * Creates the user in Supabase if they don't exist yet.
 */
export async function getDbUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  if (data) return data.id;

  // Only fall through to insert if the error is "no rows found" (PGRST116)
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error);
    return null;
  }

  // User doesn't exist yet, create them
  const { data: created } = await supabase
    .from('users')
    .insert({ clerk_id: clerkId, email: '' })
    .select('id')
    .single();

  return created?.id || null;
}
