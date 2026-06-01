import type { LLMConfig, LLMProvider, ChatMessage } from './types.js';

export class OpenAIProvider implements LLMProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    let url = this.config.baseUrl.replace(/\/+$/, '');
    // Strip trailing /chat/completions if user pasted the full endpoint
    if (url.endsWith('/chat/completions')) {
      url = url.slice(0, -'/chat/completions'.length);
    }
    // Ensure /v1 suffix
    if (!url.endsWith('/v1')) {
      url = url + '/v1';
    }
    return url;
  }

  getEndpoint(): string {
    return `${this.getBaseUrl()}/chat/completions`;
  }

  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  buildPayload(messages: ChatMessage[], systemPrompt: string, maxTokens = 4096): object {
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];
    return {
      model: this.config.model,
      max_tokens: maxTokens,
      stream: true,
      messages: apiMessages,
    };
  }

  parseStreamChunk(data: string): string | null {
    if (data === '[DONE]') return null;
    try {
      const parsed = JSON.parse(data);
      return parsed.choices?.[0]?.delta?.content ?? null;
    } catch {
      return null;
    }
  }
}
