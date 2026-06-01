import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseSync {
  private supabase: SupabaseClient;
  private userId: string | null = null;
  private state: CollectorState;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey);
    this.state = loadState();
  }

  async init(userEmail: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (error || !data) {
      throw new Error(`User not found: ${userEmail}. Error: ${error?.message}`);
    }
    this.userId = data.id;
    console.log(`✓ Syncing as user ${userEmail} (${this.userId})`);
  }

  isProcessed(sessionId: string, messageCount: number): boolean {
    const prev = this.state.processedSessions[sessionId];
    return !!prev && prev.messageCount === messageCount;
  }

  async syncSession(session: ParsedSession): Promise<{ created: boolean; conversationId: string }> {
    if (!this.userId) throw new Error('Not initialized — call init() first');

    // Check if conversation already exists for this session
    const { data: existing } = await this.supabase
      .from('conversations')
      .select('id, message_count')
      .eq('user_id', this.userId)
      .ilike('title', `%${session.sessionId.slice(0, 8)}%`)
      .limit(1)
      .single();

    if (existing) {
      // Already synced — skip if same message count
      const prev = this.state.processedSessions[session.sessionId];
      if (prev && prev.messageCount >= session.messages.length) {
        return { created: false, conversationId: existing.id };
      }
      
      // Update existing conversation with new messages
      await this.upsertMessages(existing.id, session);
      this.markProcessed(session.sessionId, session.messages.length);
      return { created: false, conversationId: existing.id };
    }

    // Create new conversation
    const { data: conv, error: convErr } = await this.supabase
      .from('conversations')
      .insert({
        user_id: this.userId,
        platform: 'CLAUDE',
        title: session.title,
        message_count: session.messages.length,
        created_at: session.createdAt || new Date().toISOString(),
        imported_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (convErr || !conv) {
      throw new Error(`Failed to create conversation: ${convErr?.message}`);
    }

    // Insert messages
    await this.upsertMessages(conv.id, session);
    this.markProcessed(session.sessionId, session.messages.length);

    console.log(`✓ Synced session ${session.sessionId.slice(0, 8)} — ${session.messages.length} messages`);
    return { created: true, conversationId: conv.id };
  }

  private async upsertMessages(conversationId: string, session: ParsedSession) {
    // Delete existing messages for this conversation to avoid duplicates
    await this.supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    // Insert all messages in batches of 50
    for (let i = 0; i < session.messages.length; i += 50) {
      const batch = session.messages.slice(i, i + 50);
      const rows = batch.map((msg) => ({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        created_at: msg.timestamp || new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('messages')
        .insert(rows);

      if (error) {
        console.error(`Failed to insert messages batch ${i}:`, error.message);
      }
    }
  }

  private markProcessed(sessionId: string, messageCount: number) {
    this.state.processedSessions[sessionId] = {
      messageCount,
      syncedAt: new Date().toISOString(),
    };
    saveState(this.state);
  }
}
