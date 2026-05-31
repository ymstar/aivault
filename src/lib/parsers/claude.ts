import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

interface ClaudeChatMessage {
  sender?: string;
  text?: string;
  content?: string;
  created_at?: string;
}

interface ClaudeExportItem {
  uuid?: string;
  name?: string;
  title?: string;
  created_at?: string;
  chat_messages?: ClaudeChatMessage[];
  messages?: ClaudeChatMessage[];
}

/**
 * Parse Claude export data. Handles multiple formats:
 * 1. Direct array: [{name, chat_messages, ...}]
 * 2. Object with conversations key: {conversations: [...]}
 */
export function parseClaudeExport(data: unknown): ImportedConversation[] {
  // Handle object with conversations key
  let items: ClaudeExportItem[];
  
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object' && 'conversations' in data) {
    items = (data as { conversations: ClaudeExportItem[] }).conversations;
    if (!Array.isArray(items)) return [];
  } else {
    return [];
  }

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const messages: ImportedMessage[] = [];
      const chatMessages = item.chat_messages || item.messages || [];

      if (Array.isArray(chatMessages)) {
        for (const msg of chatMessages) {
          // Support both text and content fields
          const messageText = msg.text || msg.content;
          if (!messageText?.trim()) continue;

          // Map sender to role: human/user -> user, assistant/claude -> assistant
          let role: string;
          const sender = (msg.sender || '').toLowerCase();
          if (sender === 'human' || sender === 'user') {
            role = 'user';
          } else {
            role = 'assistant';
          }

          messages.push({
            role,
            content: messageText.trim(),
            createdAt: msg.created_at || undefined,
          });
        }
      }

      return {
        platform: Platform.CLAUDE,
        title: item.name || item.title || 'Untitled Conversation',
        createdAt: item.created_at || new Date().toISOString(),
        messages,
      };
    })
    .filter((conv) => conv.messages.length > 0); // Filter out empty conversations
}
