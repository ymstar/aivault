import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-keys';

/**
 * POST /api/collector/sync — Sync a Claude Code session to AIVault.
 * Auth: API key in Authorization header (Bearer av_xxx).
 * Body: { sessionId, title, messages: [{role, content, timestamp?}], createdAt?, model? }
 */
export async function POST(req: NextRequest) {
  // Authenticate via API key
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  
  if (!apiKey || !apiKey.startsWith('av_')) {
    return NextResponse.json(
      { error: 'Missing or invalid API key. Use: Authorization: Bearer av_xxx' },
      { status: 401 }
    );
  }

  const userId = await validateApiKey(apiKey);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Parse request body
  let body: {
    sessionId?: string;
    title?: string;
    messages?: Array<{ role: string; content: string; timestamp?: string }>;
    createdAt?: string;
    model?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId, title, messages, createdAt, model } = body;

  if (!sessionId || !messages?.length) {
    return NextResponse.json(
      { error: 'sessionId and messages[] are required' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  try {
    // Check if conversation already exists for this session
    // We store sessionId in summary field for reliable matching
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, message_count')
      .eq('user_id', userId)
      .eq('platform', 'CLAUDE')
      .eq('summary', `session:${sessionId}`)
      .limit(1)
      .single();

    if (existing) {
      // Update: delete old messages, insert new
      const { error: delErr } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', existing.id);

      if (delErr) {
        throw new Error(`Failed to clear old messages: ${delErr.message}`);
      }

      await supabase
        .from('conversations')
        .update({ message_count: messages.length })
        .eq('id', existing.id);

      await insertMessages(supabase, existing.id, messages);

      return NextResponse.json({
        action: 'updated',
        conversationId: existing.id,
        messageCount: messages.length,
      });
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        platform: 'CLAUDE',
        title: title || `Claude Code Session ${sessionId.slice(0, 8)}`,
        summary: `session:${sessionId}`,
        message_count: messages.length,
        created_at: createdAt || new Date().toISOString(),
        imported_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (convErr || !conv) {
      return NextResponse.json(
        { error: convErr?.message || 'Failed to create conversation' },
        { status: 500 }
      );
    }

    await insertMessages(supabase, conv.id, messages);

    return NextResponse.json({
      action: 'created',
      conversationId: conv.id,
      messageCount: messages.length,
    });
  } catch (err: any) {
    console.error('Collector sync error:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}

async function insertMessages(
  supabase: ReturnType<typeof createServerClient>,
  conversationId: string,
  messages: Array<{ role: string; content: string; timestamp?: string }>
) {
  // Insert in batches of 50
  for (let i = 0; i < messages.length; i += 50) {
    const batch = messages.slice(i, i + 50);
    const rows = batch.map((msg) => ({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      created_at: msg.timestamp || new Date().toISOString(),
    }));

    const { error } = await supabase.from('messages').insert(rows);
    if (error) {
      console.error('Message insert error:', error.message);
      throw new Error(`Failed to insert messages: ${error.message}`);
    }
  }
}
