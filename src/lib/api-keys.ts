import { createServerClient } from './supabase';
import crypto from 'crypto';

/**
 * Generate a new API key for a user.
 * Returns the raw key (shown once) and the stored record.
 */
export async function generateApiKey(userId: string, name: string = 'default') {
  const supabase = createServerClient();
  
  // Generate random key: av_<48 hex chars>
  const rawKey = 'av_' + crypto.randomBytes(24).toString('hex');
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10) + '...';
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
    })
    .select('id, key_prefix, name, created_at')
    .single();
  
  if (error) throw new Error(error.message);
  return { ...data, rawKey };
}

/**
 * Validate an API key and return the associated user ID.
 */
export async function validateApiKey(rawKey: string): Promise<string | null> {
  const supabase = createServerClient();
  const keyHash = hashKey(rawKey);
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !data) return null;
  
  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(
      () => {},
      (err) => console.warn('Failed to update last_used_at:', err)
    );
  
  return data.user_id;
}

/**
 * List API keys for a user (without raw keys).
 */
export async function listApiKeys(userId: string) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, key_prefix, name, last_used_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Delete an API key.
 */
export async function deleteApiKey(userId: string, keyId: string) {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);
  
  if (error) throw new Error(error.message);
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
