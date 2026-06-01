import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

/**
 * Parse Claude Code exported txt/md file.
 * 
 * Supports two formats:
 * 
 * Format 1 — Terminal export (Claude Code CLI):
 * ```
 *  ▐▛███▜▌   Claude Code v2.1.145
 * ❯ User message here
 * ⏺ Assistant response here
 * ❯ Another user message
 * ```
 * 
 * Format 2 — Markdown export:
 * ```
 * ## Human
 * Message content...
 * 
 * ## Assistant
 * Response content...
 * ```
 */
export function parseClaudeCodeExport(text: string): ImportedConversation[] {
  const lines = text.split('\n');

  // Detect format
  const isTerminalFormat = lines.some(l => l.match(/^[❯▸>]\s/) || l.match(/^[⏺●◉]\s/));

  if (isTerminalFormat) {
    return parseTerminalFormat(text);
  }
  return parseMarkdownFormat(text);
}

/**
 * Parse Claude Code terminal export format.
 * User prompts: lines starting with ❯ (or ▸ >)
 * Assistant responses: lines starting with ⏺ (or ● ◉)
 * Tool calls: lines starting with ⎿
 * System/stop lines: lines with ✻ or ✹
 */
function parseTerminalFormat(text: string): ImportedConversation[] {
  const lines = text.split('\n');
  const messages: ImportedMessage[] = [];
  let title = 'Claude Code Session';
  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];

  // Try to extract title/version from header
  const headerMatch = text.match(/Claude Code\s+v?[\d.]+/);
  if (headerMatch) {
    title = headerMatch[0].trim();
  }

  // Try to extract workspace path
  const pathMatch = text.match(/~[\/\\]\S+/);
  if (pathMatch) {
    title += ' — ' + pathMatch[0];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines when no role set
    if (!trimmed && !currentRole) continue;

    // User message: starts with ❯ or ▸
    const userMatch = trimmed.match(/^[❯▸]\s*(.*)/);
    if (userMatch) {
      // Flush previous message
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'user';
      currentContent = userMatch[1] ? [userMatch[1]] : [];
      continue;
    }

    // Assistant message: starts with ⏺ or ●
    const assistantMatch = trimmed.match(/^[⏺●◉]\s*(.*)/);
    if (assistantMatch) {
      // Flush previous message
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'assistant';
      currentContent = assistantMatch[1] ? [assistantMatch[1]] : [];
      continue;
    }

    // Tool call indicator: ⎿ — treat as assistant content
    if (trimmed.startsWith('⎿')) {
      if (currentRole === null) {
        currentRole = 'assistant';
      }
      currentContent.push(trimmed);
      continue;
    }

    // Session markers: ✻ or ✹ — skip
    if (trimmed.startsWith('✻') || trimmed.startsWith('✹') || trimmed.startsWith('⏺ Ran')) {
      continue;
    }

    // Continuation lines: add to current role's content
    if (currentRole) {
      currentContent.push(line);
    }
  }

  // Flush last message
  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      content: currentContent.join('\n').trim(),
    });
  }

  const validMessages = messages.filter(m => m.content.length > 0);
  if (validMessages.length === 0) return [];

  return [{
    platform: Platform.CLAUDE,
    title,
    createdAt: new Date().toISOString(),
    messages: validMessages,
  }];
}

/**
 * Parse markdown-style Claude Code export (original format).
 */
function parseMarkdownFormat(text: string): ImportedConversation[] {
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
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'user';
      currentContent = [];
      if (i === 0 && !trimmed.startsWith('#')) {
        title = trimmed || 'Claude Code Conversation';
      }
    } else if (assistantMatch) {
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'assistant';
      currentContent = [];
    } else if (blockquoteMatch && currentRole === null) {
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'user';
      currentContent = [blockquoteMatch[1]];
    } else if (trimmed.startsWith('# ') && i < 3) {
      title = trimmed.replace(/^#+\s*/, '') || 'Claude Code Conversation';
    } else if (currentRole) {
      currentContent.push(line);
    }
  }

  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      content: currentContent.join('\n').trim(),
    });
  }

  const validMessages = messages.filter(m => m.content.length > 0);
  if (validMessages.length === 0) return [];

  return [{
    platform: Platform.CLAUDE,
    title,
    createdAt: createdAt || new Date().toISOString(),
    messages: validMessages,
  }];
}
