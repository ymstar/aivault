import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

/**
 * Parse Claude Code exported txt/md file.
 * 
 * Expected format (markdown-like):
 * ```
 * # Title or first line
 * 
 * ## Human | User | >
 * Message content...
 * 
 * ## Assistant | Claude | AI
 * Response content...
 * ```
 * 
 * Also supports formats like:
 * ```
 * > User message
 * 
 * Assistant response
 * ```
 */
export function parseClaudeCodeExport(text: string): ImportedConversation[] {
  const lines = text.split('\n');
  const messages: ImportedMessage[] = [];
  let title = 'Claude Code Conversation';
  let currentRole: string | null = null;
  let currentContent: string[] = [];
  let createdAt: string | undefined;

  // Try to extract date from first few lines
  const dateMatch = text.match(/(?:Date|日期|Created|创建时间)[:\s]+([^\n]+)/i);
  if (dateMatch) {
    const parsed = new Date(dateMatch[1].trim());
    if (!isNaN(parsed.getTime())) {
      createdAt = parsed.toISOString();
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for role headers
    const roleMatch = trimmed.match(/^##?\s*(Human|User|用户|You|你)\s*$/i);
    const assistantMatch = trimmed.match(/^##?\s*(Assistant|Claude|AI|助手)\s*$/i);
    const blockquoteMatch = trimmed.match(/^>\s*(.+)/);

    if (roleMatch || (i === 0 && !assistantMatch && !trimmed.startsWith('#'))) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'user';
      currentContent = [];
      
      // If first line is title
      if (i === 0 && !trimmed.startsWith('#')) {
        title = trimmed || 'Claude Code Conversation';
      }
    } else if (assistantMatch) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'assistant';
      currentContent = [];
    } else if (blockquoteMatch && currentRole === null) {
      // Blockquote style: > user message
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'user';
      currentContent = [blockquoteMatch[1]];
    } else if (trimmed.startsWith('# ') && i < 3) {
      // Title
      title = trimmed.replace(/^#+\s*/, '') || 'Claude Code Conversation';
    } else if (currentRole) {
      // Message content
      currentContent.push(line);
    }
  }

  // Save last message
  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      content: currentContent.join('\n').trim(),
    });
  }

  // Filter out empty messages
  const validMessages = messages.filter(m => m.content.length > 0);

  if (validMessages.length === 0) {
    return [];
  }

  return [{
    platform: Platform.CLAUDE,  // Use CLAUDE platform for Claude Code
    title,
    createdAt: createdAt || new Date().toISOString(),
    messages: validMessages,
  }];
}
