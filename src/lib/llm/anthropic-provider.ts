import type { LLMConfig, LLMProvider, ChatMessage } from './types';

export class AnthropicProvider implements LLMProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    let url = this.config.baseUrl.replace(/\/+$/, '');
    if (!url.includes('/v1') && !url.endsWith('/v1')) {
      url = url + '/v1';
    }
    return url;
  }

  getEndpoint(): string {
    return `${this.getBaseUrl()}/messages`;
  }

  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  buildPayload(messages: ChatMessage[], systemPrompt: string, maxTokens = 4096): object {
    const apiMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    return {
      model: this.config.model,
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: apiMessages,
    };
  }

  parseStreamChunk(data: string): string | null {
    try {
      const parsed = JSON.parse(data);

      // Standard Anthropic format
      if (parsed.type === 'content_block_delta') {
        return parsed.delta?.text ?? null;
      }

      // Some proxies return OpenAI-compatible format
      if (parsed.choices?.[0]?.delta?.content) {
        return parsed.choices[0].delta.content;
      }

      // Some proxies return just { text: "..." }
      if (typeof parsed.text === 'string') {
        return parsed.text;
      }

      // Some proxies return { content: [{ text: "..." }] }
      if (parsed.content?.[0]?.text) {
        return parsed.content[0].text;
      }

      return null;
    } catch {
      return null;
    }
  }
}
