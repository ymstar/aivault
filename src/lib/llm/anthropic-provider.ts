import type { LLMConfig, LLMProvider, ChatMessage } from './types';

export class AnthropicProvider implements LLMProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    let url = this.config.baseUrl.replace(/\/+$/, '');
    // Ensure /v1 suffix for Anthropic
    if (url.endsWith('/anthropic') && !url.endsWith('/v1')) {
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
    // Anthropic: system is top-level, not in messages array
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
      if (parsed.type === 'content_block_delta') {
        return parsed.delta?.text ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
