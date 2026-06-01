import { ParsedSession } from './parser';
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '..', '.collector-state.json');

interface CollectorState {
  processedSessions: Record<string, { messageCount: number; syncedAt: string }>;
}

function loadState(): CollectorState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
  return { processedSessions: {} };
}

function saveState(state: CollectorState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Syncs parsed Claude Code sessions to AIVault via its REST API.
 * No direct database access — purely HTTP client.
 */
export class AIVaultSync {
  private apiUrl: string;
  private apiKey: string;
  private state: CollectorState;

  constructor(apiUrl: string, apiKey: string) {
    // Normalize: remove trailing slash
    this.apiUrl = apiUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.state = loadState();
  }

  /**
   * Verify connectivity to AIVault API.
   */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiUrl}/api/collector`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if a session was already synced with the same message count.
   */
  isProcessed(sessionId: string, messageCount: number): boolean {
    const prev = this.state.processedSessions[sessionId];
    return !!prev && prev.messageCount === messageCount;
  }

  /**
   * Sync a parsed session to AIVault.
   */
  async syncSession(session: ParsedSession): Promise<{ action: string; conversationId: string }> {
    const res = await fetch(`${this.apiUrl}/api/collector/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        title: session.title,
        messages: session.messages,
        createdAt: session.createdAt,
        model: session.model,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`API error ${res.status}: ${errText}`);
    }

    const result = await res.json() as { action: string; conversationId: string };
    
    // Mark as processed
    this.markProcessed(session.sessionId, session.messages.length);
    
    return result;
  }

  private markProcessed(sessionId: string, messageCount: number) {
    this.state.processedSessions[sessionId] = {
      messageCount,
      syncedAt: new Date().toISOString(),
    };
    saveState(this.state);
  }
}
