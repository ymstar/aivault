import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ParsedSession {
  sessionId: string;
  projectPath: string;
  title: string;
  messages: ParsedMessage[];
  createdAt: string;
  model?: string;
}

/**
 * Parse a Claude Code JSONL session file into structured conversation data.
 */
export async function parseSessionFile(filePath: string): Promise<ParsedSession | null> {
  const sessionId = path.basename(filePath, '.jsonl');
  const projectPath = path.basename(path.dirname(filePath));
  
  const messages: ParsedMessage[] = [];
  let title = '';
  let createdAt: string | undefined;
  let model: string | undefined;

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      
      switch (entry.type) {
        case 'queue-operation': {
          // User input prompt
          if (entry.content && typeof entry.content === 'string') {
            messages.push({
              role: 'user',
              content: entry.content,
              timestamp: entry.timestamp,
            });
            if (!createdAt && entry.timestamp) {
              createdAt = entry.timestamp;
            }
          }
          break;
        }
        
        case 'user': {
          // User message with content blocks
          const userContent = extractTextContent(entry.message?.content);
          if (userContent) {
            messages.push({
              role: 'user',
              content: userContent,
              timestamp: entry.timestamp,
            });
            if (!createdAt && entry.timestamp) {
              createdAt = entry.timestamp;
            }
          }
          break;
        }
        
        case 'assistant': {
          // Assistant response
          const assistantContent = extractTextContent(entry.message?.content);
          if (assistantContent) {
            messages.push({
              role: 'assistant',
              content: assistantContent,
              timestamp: entry.timestamp,
            });
            if (!model && entry.message?.model) {
              model = entry.message.model;
            }
          }
          break;
        }
        
        case 'ai-title': {
          // Auto-generated title
          if (entry.title) {
            title = entry.title;
          }
          break;
        }
        
        case 'last-prompt': {
          // Last user prompt (may override)
          if (entry.content && typeof entry.content === 'string') {
            // Don't add duplicate, just note it
          }
          break;
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  // Deduplicate consecutive identical user messages
  const deduped: ParsedMessage[] = [];
  for (const msg of messages) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.role === msg.role && prev.content === msg.content) continue;
    deduped.push(msg);
  }

  if (deduped.length === 0) return null;

  // Generate title from first user message if not set
  if (!title) {
    const firstUser = deduped.find(m => m.role === 'user');
    title = firstUser
      ? firstUser.content.slice(0, 100).replace(/\n/g, ' ')
      : `Session ${sessionId.slice(0, 8)}`;
  }

  return {
    sessionId,
    projectPath,
    title,
    messages: deduped,
    createdAt: createdAt || new Date().toISOString(),
    model,
  };
}

/**
 * Extract text content from Claude Code message content blocks.
 * Filters out thinking, tool_use, tool_result — keeps only text.
 */
function extractTextContent(content: unknown): string {
  if (!content) return '';
  
  if (typeof content === 'string') return content;
  
  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (block && typeof block === 'object') {
        if (block.type === 'text' && block.text) {
          texts.push(block.text);
        } else if (block.type === 'tool_result' && block.content) {
          // Tool results may contain text
          const subText = extractTextContent(block.content);
          if (subText) texts.push(subText);
        }
      }
    }
    return texts.join('\n');
  }
  
  return '';
}
