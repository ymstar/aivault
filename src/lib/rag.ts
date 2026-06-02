import { createServerClient } from '@/lib/supabase';
import { generateEmbedding, searchSimilar, isEmbeddingReady } from '@/lib/embeddings';

export async function retrieveRAGContext(userId: string, query: string): Promise<string> {
  const supabase = createServerClient();
  let context = '';

  try {
    // Strategy 1: Vector search
    let usedVectorSearch = false;
    try {
      const embeddingReady = await isEmbeddingReady();
      if (embeddingReady) {
        const queryEmbedding = await generateEmbedding(query);
        const similar = await searchSimilar(queryEmbedding, userId, 10);

        if (similar.length > 0) {
          const convIds = [...new Set(similar.map((r: { conversation_id: string }) => r.conversation_id))] as string[];

          const { data: messages } = await supabase
            .from('messages')
            .select('role, content')
            .in('conversation_id', convIds)
            .order('created_at', { ascending: true })
            .limit(100);

          if (messages?.length) {
            context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
            usedVectorSearch = true;
          }
        }
      }
    } catch (err) {
      console.warn('Vector search failed, falling back to keyword search:', err);
    }

    // Strategy 2: Keyword search on titles
    if (!usedVectorSearch) {
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

      let convs: { id: string }[] | null = null;

      if (keywords.length > 0) {
        const escapeLike = (s: string) => s.replace(/[%_]/g, '\\$&');
        const orFilters = keywords.map((k) => `title.ilike.%${escapeLike(k)}%`).join(',');
        const { data } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId)
          .or(orFilters)
          .order('created_at', { ascending: false })
          .limit(5);
        convs = data;
      }

      // Strategy 3: Most recent conversations
      if (!convs?.length) {
        const { data } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        convs = data;
      }

      if (convs?.length) {
        const convIds = convs.map((c) => c.id);
        const { data: messages } = await supabase
          .from('messages')
          .select('role, content')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true })
          .limit(200);

        if (messages?.length) {
          context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
        }
      }
    }
  } catch (err) {
    console.error('RAG context retrieval error:', err);
  }

  // Truncate to avoid exceeding LLM context window (~12K tokens)
  const MAX_CONTEXT_CHARS = 50000;
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(-MAX_CONTEXT_CHARS);
  }

  return context;
}
