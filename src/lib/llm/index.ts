import type { LLMConfig, LLMProvider, ChatMessage } from './types';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';

export type { LLMConfig, ChatMessage, LLMProvider } from './types';

export function createProvider(config: LLMConfig): LLMProvider {
  if (config.providerType === 'anthropic' || config.baseUrl.includes('anthropic')) {
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
  const response = await fetch(provider.getEndpoint(), {
    method: 'POST',
    headers: provider.getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error('LLM API returned no response body');
  }

  const decoder = new TextDecoder();
  const reader = body.getReader();

  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        const text = provider.parseStreamChunk(data);
        if (text) {
          controller.enqueue(text);
        }
      }
    },
  });
}
