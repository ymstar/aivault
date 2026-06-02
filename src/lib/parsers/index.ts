export { parseChatGPTExport } from './chatgpt';
export { parseClaudeExport } from './claude';
export { parseClaudeCodeExport } from './claude-code';
export { parseGeminiExport } from './gemini';

import { parseChatGPTExport } from './chatgpt';
import { parseClaudeExport } from './claude';
import { parseClaudeCodeExport } from './claude-code';
import { parseGeminiExport } from './gemini';
import type { ImportedConversation } from '@/types';

export function parseExport(platform: string, data: unknown, filename?: string): ImportedConversation[] {
  switch (platform) {
    case 'chatgpt':
      // ChatGPT expects array format
      return parseChatGPTExport(Array.isArray(data) ? data : [data]);
    case 'claude':
      // Check if it's a txt/md file (Claude Code export)
      if (typeof data === 'string') {
        return parseClaudeCodeExport(data);
      }
      return parseClaudeExport(data);
    case 'claude-code':
      // Explicit Claude Code txt format
      if (typeof data === 'string') {
        return parseClaudeCodeExport(data);
      }
      throw new Error('Claude Code format requires text data');
    case 'gemini':
      return parseGeminiExport(data);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
