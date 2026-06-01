import { NextResponse } from 'next/server';
import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { encryptApiKey } from '@/lib/crypto';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: { label?: string; baseUrl?: string; model?: string; apiKey?: string; isDefault?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('user_llm_configs')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!existing) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

  // If setting as default, unset other defaults first
  if (body.isDefault) {
    await supabase
      .from('user_llm_configs')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  }

  // Re-encrypt if new API key provided
  let keyFields = {};
  if (body.apiKey) {
    const { encrypted, iv, tag } = encryptApiKey(body.apiKey);
    keyFields = {
      api_key_encrypted: encrypted,
      api_key_iv: iv,
      api_key_tag: tag,
      api_key_prefix: body.apiKey.slice(0, 8),
    };
  }

  const { data, error } = await supabase
    .from('user_llm_configs')
    .update({
      ...(body.label !== undefined && { label: body.label }),
      ...(body.baseUrl !== undefined && { base_url: body.baseUrl }),
      ...(body.model !== undefined && { model: body.model }),
      ...(body.isDefault !== undefined && { is_default: body.isDefault }),
      ...keyFields,
    })
    .eq('id', id)
    .select('id, label, provider_type, base_url, model, api_key_prefix, is_default, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from('user_llm_configs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
