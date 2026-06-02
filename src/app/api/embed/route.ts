import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase';
import { batchGenerateEmbeddings } from '@/lib/embeddings';

/**
 * POST /api/embed — Generate embeddings for conversation messages.
 * Processes conversations that don't have embeddings yet.
 * Body: { conversationId?: string, batchSize?: number }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { conversationId, batchSize = 500 } = body;

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    let targetConvIds: string[] = [];

    if (conversationId) {
      // Verify ownership
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      targetConvIds = [conversationId];
    } else {
      // Get all user's conversations
      const { data: userConvs } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      targetConvIds = userConvs?.map((c) => c.id) || [];
    }

    if (targetConvIds.length === 0) {
      return NextResponse.json({ message: 'No conversations found', embedded: 0 });
    }

    // Get conversation IDs that already have embeddings
    const { data: embeddedConvs } = await supabase
      .from('embeddings')
      .select('conversation_id')
      .in('conversation_id', targetConvIds);
    const embeddedConvIds = new Set(embeddedConvs?.map((e) => e.conversation_id) || []);

    // Find conversations WITHOUT embeddings (prioritize these)
    const unembeddedConvIds = targetConvIds.filter((id) => !embeddedConvIds.has(id));

    let totalEmbedded = 0;
    let processedConvs = 0;

    // Process conversations without any embeddings first
    for (const convId of unembeddedConvIds) {
      if (totalEmbedded >= batchSize) break;

      const { data: messages } = await supabase
        .from('messages')
        .select('id, conversation_id, content, role')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(batchSize - totalEmbedded);

      if (!messages || messages.length === 0) continue;

      const texts = messages.map((m) => `[${m.role}]: ${m.content.slice(0, 4000)}`);
      const embeddings = await batchGenerateEmbeddings(texts);

      for (let i = 0; i < messages.length; i += 50) {
        const batch = messages.slice(i, i + 50);
        const batchEmb = embeddings.slice(i, i + 50);

        const rows = batch.map((msg, j) => ({
          message_id: msg.id,
          conversation_id: msg.conversation_id,
          user_id: user.id,
          content: msg.content.slice(0, 4000),
          embedding: JSON.stringify(batchEmb[j]),
        }));

        const { error } = await supabase.from('embeddings').insert(rows);
        if (error) {
          console.error('Embedding insert error:', error.message);
        } else {
          totalEmbedded += batch.length;
        }
      }
      processedConvs++;
    }

    // Calculate remaining
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', targetConvIds);

    const { count: totalEmbeddings } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', targetConvIds);

    const remaining = Math.max(0, (totalMessages || 0) - (totalEmbeddings || 0));

    return NextResponse.json({
      message: totalEmbedded > 0
        ? `Embedded ${totalEmbedded} messages from ${processedConvs} conversations`
        : 'All messages already embedded',
      embedded: totalEmbedded,
      remaining,
      conversationsProcessed: processedConvs,
      totalConversations: targetConvIds.length,
    });
  } catch (err: unknown) {
    console.error('Embed error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Embedding failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
