export { parseChatGPTExport } from './chatgpt';
export { parseClaudeExport } from './claude';

import { parseChatGPTExport } from './chatgpt';
import { parseClaudeExport } from './claude';
import type { ImportedConversation } from '@/types';

export function parseExport(platform: string, data: unknown): ImportedConversation[] {
  switch (platform) {
    case 'chatgpt':
      // ChatGPT expects array format
      return parseChatGPTExport(Array.isArray(data) ? data : [data]);
    case 'claude':
      return parseClaudeExport(data);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
