import { NextResponse } from 'next/server';
import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { encryptApiKey } from '@/lib/crypto';

export async function GET() {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_llm_configs')
    .select('id, label, provider_type, base_url, model, api_key_prefix, is_default, created_at')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configs: data });
}

export async function POST(req: Request) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { label?: string; providerType?: string; baseUrl?: string; model?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { label, providerType, baseUrl, model, apiKey } = body;
  if (!label || !providerType || !baseUrl || !model || !apiKey) {
    return NextResponse.json({ error: 'Missing required fields: label, providerType, baseUrl, model, apiKey' }, { status: 400 });
  }

  if (providerType !== 'openai_compatible' && providerType !== 'anthropic') {
    return NextResponse.json({ error: 'providerType must be openai_compatible or anthropic' }, { status: 400 });
  }

  const { encrypted, iv, tag } = encryptApiKey(apiKey);
  const prefix = apiKey.slice(0, 8);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_llm_configs')
    .insert({
      user_id: userId,
      label,
      provider_type: providerType,
      base_url: baseUrl,
      model,
      api_key_encrypted: encrypted,
      api_key_iv: iv,
      api_key_tag: tag,
      api_key_prefix: prefix,
    })
    .select('id, label, provider_type, base_url, model, api_key_prefix, is_default, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data }, { status: 201 });
}
