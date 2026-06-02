import { NextResponse } from 'next/server';
import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, title, provider_id, model_override, rag_enabled, message_count, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, metadata, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ session, messages: messages || [] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: { title?: string; providerId?: string; ragEnabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify session exists and belongs to user
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('chat_sessions')
    .update({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.providerId !== undefined && { provider_id: body.providerId }),
      ...(body.ragEnabled !== undefined && { rag_enabled: body.ragEnabled }),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, title, provider_id, model_override, rag_enabled, message_count, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
