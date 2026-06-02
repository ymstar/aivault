import type { LLMConfig, ChatMessage } from './types';
import { createProvider } from './index';

/**
 * Generate a single non-streaming completion.
 * Reads the full stream and returns the concatenated text.
 */
export async function generateCompletion(
  config: LLMConfig,
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens = 1024,
): Promise<string> {
  const provider = createProvider(config);
  const payload = provider.buildPayload(messages, systemPrompt, maxTokens);

  // Override stream to false for non-streaming
  const nonStreamPayload = { ...payload, stream: false };

  const response = await fetch(provider.getEndpoint(), {
    method: 'POST',
    headers: provider.getHeaders(),
    body: JSON.stringify(nonStreamPayload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // OpenAI-compatible format
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content.trim();
  }

  // Anthropic format
  if (data.content?.[0]?.text) {
    return data.content[0].text.trim();
  }

  throw new Error('Unexpected LLM response format');
}
