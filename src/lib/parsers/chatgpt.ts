import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

interface ChatGPTMessageNode {
  message?: {
    content?: {
      parts?: string[];
    };
    create_time?: number;
    author?: {
      role?: string;
    };
  };
}

interface ChatGPTExportItem {
  title?: string;
  create_time?: number;
  mapping?: Record<string, ChatGPTMessageNode>;
}

const VALID_ROLES = new Set(['user', 'assistant', 'system']);

export function parseChatGPTExport(data: ChatGPTExportItem[]): ImportedConversation[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const messages: ImportedMessage[] = [];

      if (item.mapping && typeof item.mapping === 'object') {
        for (const node of Object.values(item.mapping)) {
          if (!node?.message) continue;

          const role = node.message.author?.role;
          const parts = node.message.content?.parts;

          if (!role || !VALID_ROLES.has(role)) continue;
          if (!parts || !Array.isArray(parts) || parts.length === 0) continue;

          const content = parts.filter(Boolean).join('\n').trim();
          if (!content) continue;

          messages.push({
            role: role as ImportedMessage['role'],
            content,
            createdAt: node.message.create_time
              ? new Date(node.message.create_time * 1000).toISOString()
              : undefined,
          });
        }
      }

      messages.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const createdAt = item.create_time
        ? new Date(item.create_time * 1000).toISOString()
        : new Date().toISOString();

      return {
        platform: Platform.CHATGPT,
        title: item.title || 'Untitled Conversation',
        createdAt,
        messages,
      };
    });
}
