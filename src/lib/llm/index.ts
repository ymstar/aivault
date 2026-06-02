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

/**
 * Non-streaming completion - fallback when streaming fails
 */
export async function completion(
  provider: LLMProvider,
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens?: number,
): Promise<string> {
  const payload = provider.buildPayload(messages, systemPrompt, maxTokens);
  // Disable streaming for non-streaming mode
  const nonStreamPayload = { ...payload, stream: false };

  const endpoint = provider.getEndpoint();
  console.log('[LLM] Non-streaming request to:', endpoint);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: provider.getHeaders(),
      body: JSON.stringify(nonStreamPayload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('LLM request timed out');
    }
    throw err;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // Anthropic format
  if (data.content) {
    const textBlocks = data.content.filter((b: { type: string }) => b.type === 'text');
    return textBlocks.map((b: { text: string }) => b.text).join('');
  }

  // OpenAI format
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error('Unexpected response format');
}

export async function streamCompletion(
  provider: LLMProvider,
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens?: number,
): Promise<ReadableStream<string>> {
  const payload = provider.buildPayload(messages, systemPrompt, maxTokens);
  const endpoint = provider.getEndpoint();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: provider.getHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('LLM request timed out');
    }
    throw err;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error('LLM API returned no response body');
  }

  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';

  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip comment lines
        if (trimmed.startsWith(':')) continue;

        // Skip event lines
        if (trimmed.startsWith('event:')) continue;

        // Handle data lines
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          const text = provider.parseStreamChunk(data);
          if (text) {
            controller.enqueue(text);
          }
        }
      }
    },
  });
}
