import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/agents — List MCP-registered collector agents for the current user.
 * Uses Clerk session auth (dashboard frontend).
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ agents: [] });
    }

    // collector_agents is not in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error } = await db
      .from('collector_agents')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen', { ascending: false });

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ agents: [] });
      }
      throw error;
    }

    const now = Date.now();
    const OFFLINE_THRESHOLD = 5 * 60 * 1000;

    const agents = (data || []).map((a: Record<string, unknown>) => ({
      id: a.id,
      agentId: a.agent_id,
      name: a.name,
      platform: a.platform,
      metadata: a.metadata,
      online: now - new Date(a.last_seen as string).getTime() < OFFLINE_THRESHOLD,
      lastSeen: a.last_seen,
      createdAt: a.created_at,
    }));

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[Agents API] error:', error);
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents?id=xxx — Remove a registered agent.
 */
export async function DELETE(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('id');
    if (!agentId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error } = await db
      .from('collector_agents')
      .delete()
      .eq('id', agentId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Agents API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
