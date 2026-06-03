import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateApiKey } from '@/lib/api-keys';

/**
 * Collector Agents API
 *
 * Auth: API key in Authorization header (Bearer av_xxx).
 *
 * GET  /api/collector/agents          — list registered agents
 * POST /api/collector/agents          — register a new agent
 * PATCH /api/collector/agents         — send heartbeat
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = { [key: string]: any };

async function authenticate(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!apiKey || !apiKey.startsWith('av_')) return null;
  return validateApiKey(apiKey);
}

function isTableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  return (
    e.code === '42P01' ||
    (typeof e.message === 'string' && e.message.includes('does not exist')) ||
    (typeof e.message === 'string' && e.message.includes('relation') && e.message.includes('does not exist')) ||
    (typeof e.message === 'string' && e.message.includes('collector_agents'))
  );
}

// GET — list agents
export async function GET(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error } = await db
      .from('collector_agents')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen', { ascending: false });

    if (error) {
      if (isTableMissing(error)) {
        return NextResponse.json({
          agents: [],
          note: 'collector_agents table not found. Run migration: supabase/migrations/006_collector_agents.sql',
        });
      }
      console.error('[Collector Agents] GET supabase error:', error);
      return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
    }

    const now = Date.now();
    const agents: AnyRow[] = ((data || []) as AnyRow[]).map((a: AnyRow) => ({
      ...a,
      status: now - new Date(a.last_seen).getTime() > 5 * 60 * 1000 ? 'offline' : a.status,
    }));

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[Collector Agents] GET error:', error);
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
}

// POST — register agent
export async function POST(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, platform, metadata } = body;

    if (!name || !platform) {
      return NextResponse.json({ error: 'name and platform are required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error } = await db
      .from('collector_agents')
      .insert({
        agent_id: agentId,
        user_id: userId,
        name,
        platform: platform.toUpperCase(),
        metadata: metadata || {},
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (isTableMissing(error)) {
        return NextResponse.json({
          error: 'collector_agents table not found. Run migration: supabase/migrations/006_collector_agents.sql',
        }, { status: 503 });
      }
      console.error('[Collector Agents] POST supabase error:', error);
      return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Collector Agents] POST error:', error);
    return NextResponse.json({ error: 'Failed to register agent' }, { status: 500 });
  }
}

// PATCH — heartbeat
export async function PATCH(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error } = await db
      .from('collector_agents')
      .update({ last_seen: new Date().toISOString(), status: 'online' })
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (isTableMissing(error)) {
        return NextResponse.json({
          error: 'collector_agents table not found. Run migration: supabase/migrations/006_collector_agents.sql',
        }, { status: 503 });
      }
      console.error('[Collector Agents] PATCH supabase error:', error);
      return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lastSeen: data?.last_seen });
  } catch (error) {
    console.error('[Collector Agents] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
  }
}
