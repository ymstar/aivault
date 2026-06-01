import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { generateEmbedding, searchSimilar, isEmbeddingReady } from '@/lib/embeddings';

export async function POST(req: Request) {
  let userId: string | null;
  try {
    userId = await getDbUserId();
  } catch (err) {
    console.error('Auth error:', err);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    message?: string;
    conversationId?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, conversationId, apiKey: userApiKey, baseUrl: userBaseUrl, model: userModel } = body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = userApiKey || process.env.MIMO_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'NO_API_KEY', message: 'Please configure an API Key in Chat settings.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let baseUrl = (userBaseUrl || 'https://token-plan-cn.xiaomimimo.com/anthropic/v1').replace(/\/+$/, '');
  // Auto-fix: if baseUrl ends with /anthropic but no /v1, append /v1
  if (baseUrl.endsWith('/anthropic') || baseUrl.endsWith('anthropic')) {
    baseUrl = baseUrl + '/v1';
  }
  const model = userModel || 'mimo-v2-pro';

  // Detect API format: Anthropic if path contains 'anthropic', else OpenAI
  const isAnthropic = baseUrl.includes('anthropic');

  // --- Fetch conversation context from Supabase ---
  const supabase = createServerClient();
  let context = '';

  try {
    if (conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (convErr) console.error('Error fetching conversation:', convErr);

      if (conv) {
        const { data: messages, error: msgErr } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (msgErr) console.error('Error fetching messages:', msgErr);

        if (messages?.length) {
          context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
        }
      }
    } else {
      // Try vector search first, fall back to keyword search
      let usedVectorSearch = false;

      try {
        const embeddingReady = await isEmbeddingReady();
        if (embeddingReady) {
          const queryEmbedding = await generateEmbedding(message);
          const similar = await searchSimilar(queryEmbedding, userId, 10);

          if (similar.length > 0) {
            const convIds = [...new Set(similar.map((r: any) => r.conversation_id))] as string[];

            const { data: messages, error: msgErr } = await supabase
              .from('messages')
              .select('role, content, conversation_id')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: true })
              .limit(100);

            if (msgErr) {
              console.error('Error fetching vector-matched messages:', msgErr);
            } else if (messages?.length) {
              context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
              usedVectorSearch = true;
            }
          }
        }
      } catch (err) {
        console.warn('Vector search failed, falling back to keyword search:', err);
      }

      // Fallback: keyword-based search
      if (!usedVectorSearch) {
        const keywords = message
          .toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 2);

        let convs: { id: string }[] | null = null;

        if (keywords.length > 0) {
          const orFilters = keywords
            .map((k: string) => `title.ilike.%${k}%`)
            .join(',');
          const { data, error: searchErr } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', userId)
            .or(orFilters)
            .order('created_at', { ascending: false })
            .limit(5);

          if (searchErr) console.error('Error searching conversations:', searchErr);
          convs = data;
        }

        if (!convs?.length) {
          const { data, error: recentErr } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

          if (recentErr) console.error('Error fetching recent conversations:', recentErr);
          convs = data;
        }

        if (convs?.length) {
          const convIds = convs.map((c) => c.id);
          const { data: messages, error: msgErr } = await supabase
            .from('messages')
            .select('role, content, conversation_id')
            .in('conversation_id', convIds)
            .order('created_at', { ascending: true })
            .limit(200);

          if (msgErr) console.error('Error fetching context messages:', msgErr);

          if (messages?.length) {
            context = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');
          }
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error fetching context:', err);
  }

  const systemPrompt = `You are AIVault AI assistant. You help users understand and explore their AI conversation history. Answer questions based on the provided conversation context.

${context ? `Conversation context:\n${context}` : 'No relevant conversation context found. Answer based on general knowledge.'}`;

  // --- Call LLM API with streaming ---
  let response: Response;
  try {
    if (isAnthropic) {
      // Anthropic Messages API format
      response = await fetch(`${baseUrl}/messages`, {
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
          messages: [{ role: 'user', content: message.trim() }],
        }),
      });
    } else {
      // OpenAI Chat Completions API format
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message.trim() },
          ],
        }),
      });
    }
  } catch (err) {
    console.error('LLM API fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to LLM API. Please check your Base URL and network connection.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!response.ok) {
    let errorMsg = `LLM API returned status ${response.status}`;
    try {
      const errBody = await response.text();
      console.error('LLM API error:', response.status, errBody);
      try {
        const errJson = JSON.parse(errBody);
        errorMsg = errJson.error?.message || errJson.message || errJson.error || errBody.slice(0, 300);
      } catch {
        errorMsg = errBody.slice(0, 300) || errorMsg;
      }
    } catch {}
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Stream SSE from LLM to client ---
  const reader = response.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({ error: 'No response stream received from LLM' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';
      let hasContent = false;
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
            if (!data || data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);

              if (isAnthropic) {
                // Anthropic: content_block_delta → delta.text
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(parsed.delta.text));
                  hasContent = true;
                }
              } else {
                // OpenAI: choices[0].delta.content
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                  hasContent = true;
                }
              }
            } catch {}
          }
        }
        // Process remaining buffer
        if (buffer.trim()) {
          const remaining = buffer.split('\n');
          for (const line of remaining) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (isAnthropic) {
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(parsed.delta.text));
                  hasContent = true;
                }
              } else {
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                  hasContent = true;
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Stream processing error:', err);
        if (!hasContent) {
          controller.enqueue(encoder.encode('Error: Stream was interrupted.'));
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
