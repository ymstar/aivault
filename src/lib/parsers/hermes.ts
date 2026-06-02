import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

// ─── Hermes Agent Export Format ─────────────────────────────────────────────
// Hermes Agent is a lightweight agent framework. Since it doesn't persist
// conversations locally by default, this parser supports a standard JSONL
// export format that Hermes-compatible tools can produce:
//
// Format 1 — JSONL (one JSON object per line):
//   { "type": "meta", "title": "...", "timestamp": "...", "model": "..." }
//   { "type": "user", "content": "...", "timestamp": "..." }
//   { "type": "assistant", "content": "...", "timestamp": "..." }
//
// Format 2 — JSON array:
//   [{ role: "user", content: "..." }, { role: "assistant", content: "..." }]
//
// Format 3 — Structured export:
//   { title, createdAt, messages: [{ role, content }] }
//
// Also handles generic agent JSONL with response_item pattern
// (similar to Codex/CLI agent format).
// ─────────────────────────────────────────────────────────────────────────────

interface HermesMessage {
  type?: string;
  role?: string;
  content?: string;
  text?: string;
  timestamp?: string;
  created_at?: string;
}

interface HermesExport {
  title?: string;
  createdAt?: string;
  created_at?: string;
  messages?: HermesMessage[];
  conversation?: HermesMessage[];
}

function normalizeTimestamp(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function extractRole(msg: HermesMessage): 'user' | 'assistant' | null {
  const raw = (msg.role || msg.type || '').toLowerCase();
  if (raw === 'user' || raw === 'human') return 'user';
  if (raw === 'assistant' || raw === 'model' || raw === 'agent') return 'assistant';
  return null;
}

function extractText(msg: HermesMessage): string {
  return (msg.content || msg.text || '').trim();
}

// Parse JSONL format
function parseJSONL(text: string): ImportedConversation[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  const messages: ImportedMessage[] = [];
  let title = 'Hermes Agent Session';
  let createdAt: string | undefined;

  for (const line of lines) {
    let entry: HermesMessage;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Meta line
    if (entry.type === 'meta') {
      if (entry.text) title = entry.text;
      continue;
    }

    const role = extractRole(entry);
    if (!role) continue;

    const content = extractText(entry);
    if (!content) continue;

    messages.push({
      role,
      content,
      createdAt: normalizeTimestamp(entry.timestamp || entry.created_at),
    });

    if (!createdAt && entry.timestamp) {
      createdAt = normalizeTimestamp(entry.timestamp);
    }
  }

  if (messages.length === 0) return [];

  return [
    {
      platform: Platform.HERMES,
      title,
      createdAt: createdAt || new Date().toISOString(),
      messages,
    },
  ];
}

// Parse structured JSON format
function parseJSON(data: HermesExport): ImportedConversation[] {
  // Array of messages
  const rawMessages = data.messages || data.conversation;
  if (Array.isArray(rawMessages)) {
    const messages: ImportedMessage[] = [];

    for (const msg of rawMessages) {
      const role = extractRole(msg);
      if (!role) continue;

      const content = extractText(msg);
      if (!content) continue;

      messages.push({
        role,
        content,
        createdAt: normalizeTimestamp(msg.timestamp || msg.created_at),
      });
    }

    if (messages.length > 0) {
      return [
        {
          platform: Platform.HERMES,
          title: data.title || 'Hermes Agent Session',
          createdAt:
            normalizeTimestamp(data.createdAt || data.created_at) ||
            messages[0].createdAt ||
            new Date().toISOString(),
          messages,
        },
      ];
    }
  }

  return [];
}

export function parseHermesExport(data: unknown, filename?: string): ImportedConversation[] {
  // String input → JSONL
  if (typeof data === 'string') {
    return parseJSONL(data);
  }

  // Array input
  if (Array.isArray(data)) {
    // Could be array of sessions or array of messages
    if (data.length > 0 && (data[0] as HermesExport).messages) {
      return data
        .map((item) => parseJSON(item as HermesExport))
        .flat()
        .filter((c) => c.messages.length > 0);
    }
    // Array of messages (single conversation)
    const result = parseJSON({ messages: data as HermesMessage[] });
    if (result.length > 0) return result;
    return [];
  }

  // Object input
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // { sessions: [...] } or { conversations: [...] }
    if (Array.isArray(obj.sessions)) {
      return (obj.sessions as HermesExport[])
        .map(parseJSON)
        .flat()
        .filter((c) => c.messages.length > 0);
    }
    if (Array.isArray(obj.conversations)) {
      return (obj.conversations as HermesExport[])
        .map(parseJSON)
        .flat()
        .filter((c) => c.messages.length > 0);
    }

    return parseJSON(data as HermesExport);
  }

  return [];
}
