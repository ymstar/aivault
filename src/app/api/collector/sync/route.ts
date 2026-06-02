import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-keys';
import { Platform } from '@/types';

/**
 * POST /api/collector/sync — Sync a conversation to AIVault.
 * Auth: API key in Authorization header (Bearer av_xxx).
 * Body: {
 *   sessionId: string,       // unique session identifier
 *   platform: string,        // CLAUDE | CODEX | CURSOR | OPENCODE | HERMES | etc.
 *   title?: string,
 *   messages: [{role, content, timestamp?}],
 *   createdAt?: string,
 *   model?: string
 * }
 */
export async function POST(req: NextRequest) {
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

  let body: {
    sessionId?: string;
    platform?: string;
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

  const { sessionId, platform = 'OTHER', title, messages, createdAt, model } = body;

  if (!sessionId || !messages?.length) {
    return NextResponse.json(
      { error: 'sessionId and messages[] are required' },
      { status: 400 }
    );
  }

  // Validate platform
  const validPlatforms = Object.values(Platform);
  const normalizedPlatform = platform.toUpperCase();
  const finalPlatform = validPlatforms.includes(normalizedPlatform as Platform)
    ? (normalizedPlatform as Platform)
    : Platform.OTHER;

  const supabase = createServerClient();

  try {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, message_count')
      .eq('user_id', userId)
      .eq('summary', `session:${sessionId}`)
      .limit(1)
      .single();

    if (existing) {
      // Update existing conversation
      await supabase.from('messages').delete().eq('conversation_id', existing.id);
      await supabase
        .from('conversations')
        .update({
          message_count: messages.length,
          title: title || undefined,
        })
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
        platform: finalPlatform,
        title: title || `${platform} Session ${sessionId.slice(0, 8)}`,
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

    // Auto-trigger embedding (async)
    const embedUrl = new URL('/api/embed', req.url).toString();
    fetch(embedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({ conversationId: conv.id }),
    }).catch(() => {});

    return NextResponse.json({
      action: 'created',
      conversationId: conv.id,
      messageCount: messages.length,
    });
  } catch (err: unknown) {
    console.error('Collector sync error:', err);
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function insertMessages(
  supabase: ReturnType<typeof createServerClient>,
  conversationId: string,
  messages: Array<{ role: string; content: string; timestamp?: string }>,
) {
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
      throw new Error(`Failed to insert messages: ${error.message}`);
    }
  }
}
