import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const userId = await getDbUserId();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { message, conversationId } = await req.json();
  if (!message) {
    return new Response('Message is required', { status: 400 });
  }

  const supabase = createServerClient();
  let context = '';

  if (conversationId) {
    // Fetch specific conversation's messages
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (conv) {
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (messages?.length) {
        context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
      }
    }
  } else {
    // Search across user's conversations for relevant context
    const keywords = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    
    let convQuery = supabase
      .from('conversations')
      .select('id, title')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (keywords.length > 0) {
      const orFilters = keywords
        .map((k: string) => `title.ilike.%${k}%`)
        .join(',');
      convQuery = convQuery.or(orFilters);
    }

    const { data: convs } = await convQuery;

    if (convs?.length) {
      const convIds = convs.map((c) => c.id);
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content, conversation_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })
        .limit(200);

      if (messages?.length) {
        context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
      }
    }
  }

  const systemPrompt = `You are AIVault AI assistant. You help users understand and explore their AI conversation history. Answer questions based on the provided conversation context.

${context ? `Conversation context:\n${context}` : 'No relevant conversation context found. Answer based on general knowledge.'}`;

  // Call MiMo LLM API (Anthropic Messages format) with streaming
  const response = await fetch('https://token-plan-cn.xiaomimimo.com/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'sk-JtJbKGBz6n5GEMw8YVAG8A8bbJVOYjvA3sSFNzaVvR7OW6ku',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'mimo-v2-pro',
      max_tokens: 2048,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('MiMo API error:', err);
    return new Response('LLM request failed', { status: 500 });
  }

  // Stream SSE from MiMo to client
  const reader = response.body?.getReader();
  if (!reader) return new Response('No stream', { status: 500 });

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                controller.enqueue(new TextEncoder().encode(parsed.delta.text));
              }
            } catch {}
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
