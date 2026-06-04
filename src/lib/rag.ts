import { createServerClient } from '@/lib/supabase';
import { generateEmbedding, searchSimilar, isEmbeddingReady } from '@/lib/embeddings';

export interface RAGSource {
  conversation_id: string;
  conversation_title: string;
  message_id: string;
  similarity: number;
  snippet: string;
}

interface SimilarResult {
  conversation_id: string;
  message_id: string;
  content?: string;
  similarity?: number;
}

export interface RAGResult {
  context: string;
  sources: RAGSource[];
}

export async function retrieveRAGContext(userId: string, query: string): Promise<RAGResult> {
  const supabase = createServerClient();
  let context = '';
  const sources: RAGSource[] = [];

  try {
    // Strategy 1: Vector search
    let usedVectorSearch = false;
    try {
      const embeddingReady = await isEmbeddingReady();
      if (embeddingReady) {
        const queryEmbedding = await generateEmbedding(query);
        const similar: SimilarResult[] = await searchSimilar(queryEmbedding, userId, 10);

        if (similar.length > 0) {
          const convIds = [...new Set(similar.map((r) => r.conversation_id))] as string[];

          const { data: messages } = await supabase
            .from('messages')
            .select('id, conversation_id, role, content')
            .in('conversation_id', convIds)
            .order('created_at', { ascending: true })
            .limit(100);

          if (messages?.length) {
            context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
            usedVectorSearch = true;

            // Build sources from vector search results
            const { data: convTitles } = await supabase
              .from('conversations')
              .select('id, title')
              .in('id', convIds);

            const titleMap = new Map<string, string>();
            (convTitles || []).forEach((c) => titleMap.set(c.id, c.title));

            // Deduplicate by conversation and take top 5
            const seen = new Set<string>();
            for (const result of similar) {
              if (sources.length >= 5) break;
              if (seen.has(result.conversation_id)) continue;
              seen.add(result.conversation_id);

              const matchedMsg = messages.find(
                (m) => m.conversation_id === result.conversation_id
              );

              sources.push({
                conversation_id: result.conversation_id,
                conversation_title: titleMap.get(result.conversation_id) || 'Untitled',
                message_id: result.message_id || matchedMsg?.id || '',
                similarity: result.similarity ?? 0,
                snippet: matchedMsg?.content?.slice(0, 200) || '',
              });
            }
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

      let convs: { id: string; title: string }[] | null = null;

      if (keywords.length > 0) {
        const escapeLike = (s: string) => s.replace(/[%_]/g, '\\$&');
        const orFilters = keywords.map((k) => `title.ilike.%${escapeLike(k)}%`).join(',');
        const { data } = await supabase
          .from('conversations')
          .select('id, title')
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
          .select('id, title')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        convs = data;
      }

      if (convs?.length) {
        const convIds = convs.map((c) => c.id);
        const { data: messages } = await supabase
          .from('messages')
          .select('id, conversation_id, role, content')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true })
          .limit(200);

        if (messages?.length) {
          context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');

          const titleMap = new Map<string, string>();
          convs.forEach((c) => titleMap.set(c.id, c.title));

          const seen = new Set<string>();
          for (const conv of convs) {
            if (sources.length >= 5) break;
            if (seen.has(conv.id)) continue;
            seen.add(conv.id);

            const firstMsg = messages.find((m) => m.conversation_id === conv.id);
            sources.push({
              conversation_id: conv.id,
              conversation_title: conv.title,
              message_id: firstMsg?.id || '',
              similarity: 0,
              snippet: firstMsg?.content?.slice(0, 200) || '',
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('RAG context retrieval error:', err);
  }

  // Truncate to avoid exceeding LLM context window (~12K tokens).
  // Vector search returns results by similarity, so the most relevant
  // content is at the start — keep the head, not the tail.
  const MAX_CONTEXT_CHARS = 15000;
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS);
  }

  return { context, sources };
}
