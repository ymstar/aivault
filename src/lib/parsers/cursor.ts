import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

// ─── Cursor Composer Data Format ───────────────────────────────────────────
// Cursor stores conversations in SQLite at:
//   ~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
//
// Table: cursorDiskKV
// Keys: "composerData:<uuid>" → JSON with:
//   { composerId, fullConversationHeadersOnly: [{bubbleId, type}], conversationMap: {...} }
//
// Since Cursor has no standard export, this parser accepts:
//
// Format 1 — Cursor Composer JSON (exported via script):
//   { composerId, title?, createdAt?, messages: [{ role, content, timestamp? }] }
//
// Format 2 — Array of composer entries:
//   [{ composerId, title?, messages: [...] }]
//
// Format 3 — Raw conversationMap format:
//   { conversationMap: { "bubbleId": { type, text, role?, ... } } }
// ─────────────────────────────────────────────────────────────────────────────

interface CursorMessage {
  role?: string;
  content?: string;
  text?: string;
  timestamp?: string;
  type?: number;
}

interface CursorComposerEntry {
  composerId?: string;
  title?: string;
  createdAt?: number | string;
  conversationMap?: Record<string, CursorMessage>;
  fullConversationHeadersOnly?: Array<{ bubbleId: string; type?: number }>;
  messages?: CursorMessage[];
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

function extractText(msg: CursorMessage): string {
  if (typeof msg.content === 'string') return msg.content.trim();
  if (typeof msg.text === 'string') return msg.text.trim();
  return '';
}

function parseComposerEntry(entry: CursorComposerEntry): ImportedConversation | null {
  const messages: ImportedMessage[] = [];

  // Format 1/2: messages array
  if (Array.isArray(entry.messages)) {
    for (const msg of entry.messages) {
      const text = extractText(msg);
      if (!text) continue;

      const rawRole = (msg.role || '').toLowerCase();
      let role: 'user' | 'assistant';
      if (rawRole === 'user' || rawRole === 'human') {
        role = 'user';
      } else if (rawRole === 'assistant' || rawRole === 'model' || rawRole === 'bot') {
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
  }

  // Format 3: conversationMap
  if (messages.length === 0 && entry.conversationMap && entry.fullConversationHeadersOnly) {
    for (const header of entry.fullConversationHeadersOnly) {
      const bubble = entry.conversationMap[header.bubbleId];
      if (!bubble) continue;

      const text = extractText(bubble);
      if (!text) continue;

      const rawRole = (bubble.role || '').toLowerCase();
      let role: 'user' | 'assistant';
      if (rawRole === 'user' || rawRole === 'human') {
        role = 'user';
      } else if (rawRole === 'assistant' || rawRole === 'model' || rawRole === 'bot') {
        role = 'assistant';
      } else {
        // Use type field: 1 = user, 2 = assistant (common Cursor convention)
        if (header.type === 1) role = 'user';
        else if (header.type === 2) role = 'assistant';
        else continue;
      }

      messages.push({
        role,
        content: text,
      });
    }
  }

  if (messages.length === 0) return null;

  const createdAt = normalizeTimestamp(entry.createdAt) || new Date().toISOString();
  const title = entry.title || `Cursor Composer ${(entry.composerId || '').slice(0, 8)}`;

  return {
    platform: Platform.CURSOR,
    title,
    createdAt,
    messages,
  };
}

export function parseCursorExport(data: unknown): ImportedConversation[] {
  if (Array.isArray(data)) {
    return data
      .map((item) => parseComposerEntry(item as CursorComposerEntry))
      .filter((c): c is ImportedConversation => c !== null);
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Object with conversations/items key
    if (Array.isArray(obj.conversations)) {
      return (obj.conversations as CursorComposerEntry[])
        .map(parseComposerEntry)
        .filter((c): c is ImportedConversation => c !== null);
    }
    if (Array.isArray(obj.items)) {
      return (obj.items as CursorComposerEntry[])
        .map(parseComposerEntry)
        .filter((c): c is ImportedConversation => c !== null);
    }

    // Single composer entry
    const result = parseComposerEntry(data as CursorComposerEntry);
    if (result) return [result];
  }

  return [];
}
