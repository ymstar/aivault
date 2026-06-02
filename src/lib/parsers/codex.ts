import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

// ─── OpenAI Codex CLI JSONL Format ─────────────────────────────────────────
// Codex stores sessions as JSONL at ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
//
// Each line is a JSON object with a `type` field:
//   - session_meta: { type, payload: { id, timestamp, cwd, model_provider, ... } }
//   - response_item: { type, payload: { type: "message", role, content: [{ type, text }] } }
//   - turn_context: { type, payload: { turn_id, cwd, model, ... } }
//   - event_msg: { type, payload: { ... } } — system events
//
// User messages: response_item.payload.role === "user", content[].type === "input_text"
// Assistant messages: response_item.payload.role === "assistant", content[].type === "output_text"
// ─────────────────────────────────────────────────────────────────────────────

interface CodexContentBlock {
  type: string;
  text?: string;
}

interface CodexResponseItem {
  type?: string;
  role?: string;
  content?: CodexContentBlock[];
}

interface CodexSessionMeta {
  id?: string;
  timestamp?: string;
  cwd?: string;
  model_provider?: string;
  cli_version?: string;
  base_instructions?: { text?: string };
}

interface CodexJSONLLine {
  timestamp?: string;
  type?: string;
  payload?: CodexResponseItem & CodexSessionMeta;
}

/**
 * Parse a Codex CLI JSONL session file.
 * Accepts the raw file text content.
 */
export function parseCodexExport(text: string): ImportedConversation[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  const messages: ImportedMessage[] = [];
  let sessionId = '';
  let createdAt: string | undefined;
  let cwd = '';

  for (const line of lines) {
    let entry: CodexJSONLLine;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (!entry.type) continue;

    switch (entry.type) {
      case 'session_meta': {
        const payload = entry.payload;
        if (payload) {
          sessionId = payload.id || '';
          createdAt = payload.timestamp || entry.timestamp;
          cwd = payload.cwd || '';
        }
        break;
      }

      case 'response_item': {
        const payload = entry.payload;
        if (!payload || payload.type !== 'message') break;

        const role = payload.role;
        const contentBlocks = payload.content;
        if (!role || !Array.isArray(contentBlocks)) break;

        // Extract text from content blocks
        const textParts: string[] = [];
        for (const block of contentBlocks) {
          if (block.type === 'input_text' && block.text) {
            textParts.push(block.text);
          } else if (block.type === 'output_text' && block.text) {
            textParts.push(block.text);
          }
        }

        if (textParts.length === 0) break;

        const content = textParts.join('\n').trim();
        if (!content) break;

        // Skip developer/system messages
        if (role === 'developer' || role === 'system') break;

        if (role === 'user') {
          messages.push({
            role: 'user',
            content,
            createdAt: entry.timestamp,
          });
        } else if (role === 'assistant') {
          messages.push({
            role: 'assistant',
            content,
            createdAt: entry.timestamp,
          });
        }
        break;
      }
    }
  }

  // Filter out very short system-context messages
  const validMessages = messages.filter((m) => {
    // Skip environment context XML blocks that are auto-injected
    if (m.content.startsWith('<environment_context>') && m.content.length < 500) {
      return false;
    }
    return m.content.length > 0;
  });

  if (validMessages.length === 0) return [];

  // Build title
  let title = 'Codex Session';
  if (cwd) {
    const parts = cwd.split('/');
    title += ` — ${parts[parts.length - 1] || cwd}`;
  }

  return [
    {
      platform: Platform.CODEX,
      title,
      createdAt: createdAt || new Date().toISOString(),
      messages: validMessages,
    },
  ];
}
