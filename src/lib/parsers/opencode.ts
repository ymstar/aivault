import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

// ─── OpenCode SQLite Format ─────────────────────────────────────────────────
// OpenCode stores data in SQLite at: ~/.local/share/opencode/opencode.db
//
// Tables:
//   session: id, project_id, title, directory, time_created, time_updated
//   message: id, session_id, time_created, time_updated, data (JSON)
//   part: id, message_id, session_id, time_created, data (JSON)
//
// message.data JSON:
//   { role: "user"|"assistant", time: { created: timestamp_ms },
//     agent: "build", model: { providerID, modelID }, tokens: {...} }
//
// part.data JSON:
//   { type: "text", text: "..." }  — user/assistant text
//   { type: "reasoning", text: "..." }  — assistant reasoning (skip)
//   { type: "step-start", ... }  — step markers (skip)
//
// Since the DB can't be uploaded directly in a browser, this parser accepts:
//
// Format 1 — Exported JSON:
//   { sessions: [{ id, title, createdAt, messages: [{ role, content, timestamp }] }] }
//
// Format 2 — Single session:
//   { id, title, messages: [...] }
//
// Format 3 — Array of sessions:
//   [{ id, title, messages: [...] }]
// ─────────────────────────────────────────────────────────────────────────────

interface OpenCodeMessage {
  role?: string;
  content?: string;
  text?: string;
  timestamp?: string | number;
}

interface OpenCodeSession {
  id?: string;
  title?: string;
  createdAt?: string | number;
  directory?: string;
  messages?: OpenCodeMessage[];
}

function normalizeTimestamp(value: string | number | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parseSession(session: OpenCodeSession): ImportedConversation | null {
  if (!session.messages || !Array.isArray(session.messages)) return null;

  const messages: ImportedMessage[] = [];

  for (const msg of session.messages) {
    const text = (msg.content || msg.text || '').trim();
    if (!text) continue;

    const rawRole = (msg.role || '').toLowerCase();
    let role: 'user' | 'assistant';
    if (rawRole === 'user' || rawRole === 'human') {
      role = 'user';
    } else if (rawRole === 'assistant' || rawRole === 'model') {
      role = 'assistant';
    } else {
      continue;
    }

    messages.push({
      role,
      content: text,
      createdAt: normalizeTimestamp(msg.timestamp),
    });
  }

  if (messages.length === 0) return null;

  const title = session.title || `OpenCode Session ${(session.id || '').slice(0, 8)}`;
  const createdAt = normalizeTimestamp(session.createdAt) || new Date().toISOString();

  return {
    platform: Platform.OPENCODE,
    title,
    createdAt,
    messages,
  };
}

export function parseOpenCodeExport(data: unknown): ImportedConversation[] {
  if (Array.isArray(data)) {
    return data
      .map((item) => parseSession(item as OpenCodeSession))
      .filter((c): c is ImportedConversation => c !== null);
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // { sessions: [...] }
    if (Array.isArray(obj.sessions)) {
      return (obj.sessions as OpenCodeSession[])
        .map(parseSession)
        .filter((c): c is ImportedConversation => c !== null);
    }

    // { conversations: [...] }
    if (Array.isArray(obj.conversations)) {
      return (obj.conversations as OpenCodeSession[])
        .map(parseSession)
        .filter((c): c is ImportedConversation => c !== null);
    }

    // Single session
    const result = parseSession(data as OpenCodeSession);
    if (result) return [result];
  }

  return [];
}
