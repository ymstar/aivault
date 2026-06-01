export interface LLMConfig {
  providerType: 'openai_compatible' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMProvider {
  buildPayload(messages: ChatMessage[], systemPrompt: string, maxTokens?: number): object;
  getEndpoint(): string;
  getHeaders(): Record<string, string>;
  parseStreamChunk(data: string): string | null;
}
