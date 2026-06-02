export { parseChatGPTExport } from './chatgpt';
export { parseClaudeExport } from './claude';
export { parseClaudeCodeExport } from './claude-code';
export { parseGeminiExport } from './gemini';
export { parseCodexExport } from './codex';
export { parseCursorExport } from './cursor';
export { parseOpenCodeExport } from './opencode';
export { parseHermesExport } from './hermes';

import { parseChatGPTExport } from './chatgpt';
import { parseClaudeExport } from './claude';
import { parseClaudeCodeExport } from './claude-code';
import { parseGeminiExport } from './gemini';
import { parseCodexExport } from './codex';
import { parseCursorExport } from './cursor';
import { parseOpenCodeExport } from './opencode';
import { parseHermesExport } from './hermes';
import type { ImportedConversation } from '@/types';

export const SUPPORTED_PLATFORMS = [
  'chatgpt', 'claude', 'claude-code', 'gemini',
  'codex', 'cursor', 'opencode', 'hermes',
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

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
    case 'codex':
      if (typeof data === 'string') {
        return parseCodexExport(data);
      }
      throw new Error('Codex format requires JSONL text data');
    case 'cursor':
      return parseCursorExport(data);
    case 'opencode':
      return parseOpenCodeExport(data);
    case 'hermes':
      return parseHermesExport(data, filename);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
