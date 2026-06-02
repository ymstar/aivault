import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase';
import { batchGenerateEmbeddings } from '@/lib/embeddings';

/**
 * POST /api/embed — Generate embeddings for conversation messages.
 * Body: { conversationId?: string, batchSize?: number }
 *   - conversationId: embed only that conversation
 *   - batchSize: max messages to process per run (default 500)
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { conversationId, batchSize = 500 } = body;

  const supabase = createServerClient();

  // Get user UUID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    // Fetch user's conversation IDs (authorization boundary)
    const { data: userConvs } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id);
    const userConvIds = userConvs?.map((c) => c.id) || [];

    if (userConvIds.length === 0) {
      return NextResponse.json({ message: 'No conversations found', embedded: 0 });
    }

    if (conversationId && !userConvIds.includes(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get IDs of messages that ALREADY have embeddings
    const { data: existingEmbeddings } = await supabase
      .from('embeddings')
      .select('message_id');
    const existingMsgIds = new Set(existingEmbeddings?.map((e) => e.message_id) || []);

    // Fetch messages, excluding those that already have embeddings
    // We fetch more than batchSize to account for already-embedded ones
    const fetchLimit = batchSize * 3;
    let query = supabase
      .from('messages')
      .select('id, conversation_id, content, role')
      .in('conversation_id', userConvIds)
      .order('created_at', { ascending: true })
      .limit(fetchLimit);

    if (conversationId) {
      query = supabase
        .from('messages')
        .select('id, conversation_id, content, role')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(fetchLimit);
    }

    const { data: messages, error: msgErr } = await query;

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    if (!messages?.length) {
      return NextResponse.json({ message: 'No messages found', embedded: 0 });
    }

    // Filter to only unembedded messages, up to batchSize
    const toEmbed = messages
      .filter((m) => !existingMsgIds.has(m.id))
      .slice(0, batchSize);

    if (toEmbed.length === 0) {
      // Check total remaining without embeddings
      const totalEmbedded = existingMsgIds.size;
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', userConvIds);

      const remaining = (totalMessages || 0) - totalEmbedded;

      return NextResponse.json({
        message: remaining > 0
          ? `Fetched messages already embedded. ${remaining} more messages in other conversations need embedding. Run again to continue.`
          : 'All messages already embedded',
        embedded: 0,
        remaining: Math.max(0, remaining),
      });
    }

    // Generate embeddings in batch
    const texts = toEmbed.map((m) => `[${m.role}]: ${m.content.slice(0, 4000)}`);
    const embeddings = await batchGenerateEmbeddings(texts);

    // Insert embeddings in batches of 50
    let inserted = 0;
    for (let i = 0; i < toEmbed.length; i += 50) {
      const batch = toEmbed.slice(i, i + 50);
      const batchEmbeddings = embeddings.slice(i, i + 50);

      const rows = batch.map((msg, j) => ({
        message_id: msg.id,
        conversation_id: msg.conversation_id,
        user_id: user.id,
        content: msg.content.slice(0, 4000),
        embedding: JSON.stringify(batchEmbeddings[j]),
      }));

      const { error: insertErr } = await supabase.from('embeddings').insert(rows);

      if (insertErr) {
        console.error('Embedding insert error:', insertErr.message);
      } else {
        inserted += batch.length;
      }
    }

    // Calculate remaining
    const totalAfter = existingMsgIds.size + inserted;
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', userConvIds);
    const remaining = Math.max(0, (totalMessages || 0) - totalAfter);

    return NextResponse.json({
      message: `Embedded ${inserted} messages`,
      embedded: inserted,
      remaining,
    });
  } catch (err: unknown) {
    console.error('Embed error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Embedding failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
