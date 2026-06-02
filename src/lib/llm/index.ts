import type { LLMConfig, LLMProvider, ChatMessage } from './types';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';

export type { LLMConfig, ChatMessage, LLMProvider } from './types';

export function createProvider(config: LLMConfig): LLMProvider {
  if (config.providerType === 'anthropic') {
    return new AnthropicProvider(config);
  }
  return new OpenAIProvider(config);
}

export async function streamCompletion(
  provider: LLMProvider,
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens?: number,
): Promise<ReadableStream<string>> {
  const payload = provider.buildPayload(messages, systemPrompt, maxTokens);
  const endpoint = provider.getEndpoint();
  const headers = provider.getHeaders();

  console.log('[LLM] Request:', endpoint);
  console.log('[LLM] Headers:', JSON.stringify(headers));
  console.log('[LLM] Payload preview:', JSON.stringify(payload).slice(0, 300));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error('[LLM] Request timed out after 25s');
    controller.abort();
  }, 25000);

  let response: Response;
  try {
    console.log('[LLM] Fetching...');
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    console.log('[LLM] Response status:', response.status);
    console.log('[LLM] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[LLM] Fetch error:', err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('LLM request timed out after 25 seconds');
    }
    throw err;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[LLM] Error body:', errorText.slice(0, 500));
    throw new Error(`LLM API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const body = response.body;
  if (!body) {
    console.error('[LLM] No response body');
    throw new Error('LLM API returned no response body');
  }

  console.log('[LLM] Stream body available, starting read...');

  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';
  let chunkCount = 0;

  return new ReadableStream<string>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[LLM] Stream done after', chunkCount, 'chunks');
          controller.close();
          return;
        }

        chunkCount++;
        const rawText = decoder.decode(value, { stream: true });

        if (chunkCount <= 3) {
          console.log(`[LLM] Raw chunk ${chunkCount}:`, rawText.slice(0, 200));
        }

        buffer += rawText;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Handle SSE format: "data: {...}"
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            const text = provider.parseStreamChunk(data);
            if (text) {
              controller.enqueue(text);
            }
          }
          // Handle event: lines (some proxies use these)
          else if (trimmed.startsWith('event: ')) {
            // Skip event lines, data will follow
          }
        }
      } catch (err) {
        console.error('[LLM] Stream read error:', err);
        controller.error(err);
      }
    },
  });
}
