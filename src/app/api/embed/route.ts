import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase';
import { generateEmbedding, batchGenerateEmbeddings } from '@/lib/embeddings';

/**
 * POST /api/embed — Generate embeddings for conversation messages.
 * Body: { conversationId?: string } — if provided, embed only that conversation.
 *        Otherwise, embed all messages without embeddings.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { conversationId } = body;

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
    // Fetch user's conversation IDs first (authorization boundary)
    const { data: userConvs } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id);
    const userConvIds = new Set(userConvs?.map(c => c.id) || []);

    if (userConvIds.size === 0) {
      return NextResponse.json({ message: 'No conversations found', embedded: 0 });
    }

    // If specific conversation requested, verify ownership
    if (conversationId && !userConvIds.has(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Fetch messages to embed (scoped to user's conversations)
    let query = supabase
      .from('messages')
      .select('id, conversation_id, content, role')
      .in('conversation_id', [...userConvIds])
      .order('created_at', { ascending: true })
      .limit(500);

    if (conversationId) {
      query = supabase
        .from('messages')
        .select('id, conversation_id, content, role')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(500);
    }

    const { data: messages, error: msgErr } = await query;

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    if (!messages?.length) {
      return NextResponse.json({ message: 'No messages to embed', embedded: 0 });
    }

    // Filter out messages that already have embeddings
    const messageIds = messages.map(m => m.id);
    const { data: existingEmbeddings } = await supabase
      .from('embeddings')
      .select('message_id')
      .in('message_id', messageIds);

    const existingIds = new Set(existingEmbeddings?.map(e => e.message_id) || []);
    const toEmbed = messages.filter(m => !existingIds.has(m.id));

    if (toEmbed.length === 0) {
      return NextResponse.json({ message: 'All messages already embedded', embedded: 0 });
    }

    // Generate embeddings in batch
    const texts = toEmbed.map(m => `[${m.role}]: ${m.content.slice(0, 4000)}`);
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

      const { error: insertErr } = await supabase
        .from('embeddings')
        .insert(rows);

      if (insertErr) {
        console.error('Embedding insert error:', insertErr.message);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      message: `Embedded ${inserted} messages`,
      embedded: inserted,
      skipped: messages.length - toEmbed.length,
    });
  } catch (err: any) {
    console.error('Embed error:', err);
    return NextResponse.json({ error: err.message || 'Embedding failed' }, { status: 500 });
  }
}
