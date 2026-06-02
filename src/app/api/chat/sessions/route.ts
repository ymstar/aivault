import { NextResponse } from 'next/server';
import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '50') || 50), 100);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, provider_id, model_override, rag_enabled, message_count, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

export async function POST(req: Request) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { title?: string; providerId?: string; ragEnabled?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabase = createServerClient();

  // If no providerId specified, use user's default
  let providerId = body.providerId;
  if (!providerId) {
    const { data: defaultConfig } = await supabase
      .from('user_llm_configs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (defaultConfig) {
      providerId = defaultConfig.id;
    } else {
      // Fall back to first available config
      const { data: firstConfig } = await supabase
        .from('user_llm_configs')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      providerId = firstConfig?.id;
    }
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: body.title || 'New Chat',
      provider_id: providerId || null,
      rag_enabled: body.ragEnabled ?? true,
    })
    .select('id, title, provider_id, model_override, rag_enabled, message_count, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}
