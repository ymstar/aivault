import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const userId = await getDbUserId();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { message, conversationId, apiKey: userApiKey, baseUrl: userBaseUrl, model: userModel } = await req.json();
  if (!message) {
    return new Response('Message is required', { status: 400 });
  }

  const apiKey = userApiKey || process.env.MIMO_API_KEY;
  if (!apiKey) {
    return new Response('Please configure API Key in Chat settings', { status: 400 });
  }

  const baseUrl = (userBaseUrl || 'https://token-plan-cn.xiaomimimo.com/anthropic/v1').replace(/\/+$/, '');
  const model = userModel || 'mimo-v2-pro';

  const supabase = createServerClient();
  let context = '';

  if (conversationId) {
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

  // Call LLM API (Anthropic Messages format) with streaming
  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('LLM API error:', err);
    return new Response(`LLM request failed: ${err.slice(0, 200)}`, { status: 502 });
  }

  // Stream SSE from LLM to client
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
