import type { ImportedConversation, ImportedMessage } from '@/types';
import { Platform } from '@/types';

// ─── Google Takeout Gemini Export Formats ────────────────────────────────────
// Google Takeout exports Gemini (formerly Bard) conversations in JSON.
// The format has evolved over time; this parser handles known variants.
//
// Variant 1 — "prompts/candidates" (most common):
//   [{ title, create_time, prompts: [{ prompt, create_time, candidates: [{ response, create_time }] }] }]
//
// Variant 2 — "mapping/turns":
//   [{ title, create_time, mapping: { "turn_1": { user: {content}, model: {content} } } }]
//
// Variant 3 — "messages array":
//   [{ title, create_time, messages: [{ role, content }] }]
// ─────────────────────────────────────────────────────────────────────────────

interface GeminiCandidate {
  response?: string;
  content?: string;
  text?: string;
  create_time?: string;
  timestamp?: string;
}

interface GeminiPrompt {
  prompt?: string;
  content?: string;
  text?: string;
  create_time?: string;
  timestamp?: string;
  candidates?: GeminiCandidate[];
  responses?: GeminiCandidate[];
}

interface GeminiTurn {
  user?: { content?: string; text?: string };
  model?: { content?: string; text?: string };
  assistant?: { content?: string; text?: string };
}

interface GeminiMessage {
  role?: string;
  content?: string;
  text?: string;
  create_time?: string;
  timestamp?: string;
  sender?: string;
}

interface GeminiExportItem {
  title?: string;
  conversation_id?: string;
  create_time?: string | number;
  createTime?: string;
  createTimeUsec?: string;
  last_update_time?: string;
  prompts?: GeminiPrompt[];
  mapping?: Record<string, GeminiTurn>;
  messages?: GeminiMessage[];
  conversation?: GeminiMessage[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeTimestamp(value: string | number | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    // Unix timestamp (seconds or milliseconds)
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  // String: try ISO parse
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const text = obj.content || obj.text || obj.response;
    if (typeof text === 'string') return text.trim();
  }
  return '';
}

// ─── Variant Parsers ─────────────────────────────────────────────────────────

function parsePromptsCandidates(item: GeminiExportItem): ImportedMessage[] {
  if (!item.prompts || !Array.isArray(item.prompts)) return [];

  const messages: ImportedMessage[] = [];

  for (const prompt of item.prompts) {
    const userText = prompt.prompt || prompt.content || prompt.text;
    if (userText?.trim()) {
      messages.push({
        role: 'user',
        content: userText.trim(),
        createdAt: normalizeTimestamp(prompt.create_time || prompt.timestamp),
      });
    }

    const candidates = prompt.candidates || prompt.responses || [];
    for (const candidate of candidates) {
      const assistantText = candidate.response || candidate.content || candidate.text;
      if (assistantText?.trim()) {
        messages.push({
          role: 'assistant',
          content: assistantText.trim(),
          createdAt: normalizeTimestamp(candidate.create_time || candidate.timestamp),
        });
        break; // Take first valid candidate only
      }
    }
  }

  return messages;
}

function parseMappingTurns(item: GeminiExportItem): ImportedMessage[] {
  if (!item.mapping || typeof item.mapping !== 'object') return [];

  const messages: ImportedMessage[] = [];

  for (const turn of Object.values(item.mapping)) {
    if (!turn || typeof turn !== 'object') continue;

    const userText = extractText(turn.user);
    if (userText) {
      messages.push({ role: 'user', content: userText });
    }

    const modelText = extractText(turn.model || turn.assistant);
    if (modelText) {
      messages.push({ role: 'assistant', content: modelText });
    }
  }

  return messages;
}

function parseMessagesArray(item: GeminiExportItem): ImportedMessage[] {
  const raw = item.messages || item.conversation;
  if (!Array.isArray(raw)) return [];

  const messages: ImportedMessage[] = [];

  for (const msg of raw) {
    const text = extractText(msg);
    if (!text) continue;

    const rawRole = (msg.role || msg.sender || '').toLowerCase();
    let role: 'user' | 'assistant';
    if (rawRole === 'user' || rawRole === 'human') {
      role = 'user';
    } else if (rawRole === 'assistant' || rawRole === 'model' || rawRole === 'gemini') {
      role = 'assistant';
    } else {
      continue; // skip unknown roles
    }

    messages.push({
      role,
      content: text,
      createdAt: normalizeTimestamp(msg.create_time || msg.timestamp),
    });
  }

  return messages;
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseGeminiExport(data: unknown): ImportedConversation[] {
  // Normalize input to array
  let items: GeminiExportItem[];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    // Could be { conversations: [...] } or a single conversation object
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.conversations)) {
      items = obj.conversations;
    } else if (Array.isArray(obj.items)) {
      items = obj.items;
    } else {
      // Single conversation object
      items = [data as GeminiExportItem];
    }
  } else {
    return [];
  }

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      // Try each parsing strategy in order
      let messages = parsePromptsCandidates(item);
      if (messages.length === 0) messages = parseMappingTurns(item);
      if (messages.length === 0) messages = parseMessagesArray(item);

      if (messages.length === 0) return null;

      // Sort messages by timestamp if available
      messages.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Resolve timestamp: try multiple field names
      const createdAt =
        normalizeTimestamp(item.create_time) ||
        normalizeTimestamp(item.createTime) ||
        (item.createTimeUsec
          ? new Date(Number(item.createTimeUsec) / 1000).toISOString()
          : undefined) ||
        messages[0]?.createdAt ||
        new Date().toISOString();

      return {
        platform: Platform.GEMINI,
        title: item.title || 'Untitled Conversation',
        createdAt,
        messages,
      };
    })
    .filter((conv): conv is ImportedConversation => conv !== null);
}
