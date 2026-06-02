import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getDbUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = await getDbUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const sp = request.nextUrl.searchParams;
    const range = sp.get('range') || '30d';
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    // Fetch conversations with imported_at / created_at since range
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, platform, created_at')
      .eq('user_id', userId)
      .gte('created_at', sinceStr)
      .order('created_at', { ascending: true });

    // Fetch messages since range
    const convIds = (convData || []).map((c) => c.id);

    // Build daily import counts
    const dailyMap = new Map<string, number>();
    const platformMap = new Map<string, number>();

    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    for (const conv of convData || []) {
      const dateKey = conv.created_at.slice(0, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
      platformMap.set(conv.platform, (platformMap.get(conv.platform) || 0) + 1);
    }

    const daily = [...dailyMap.entries()].map(([date, imports]) => ({
      date,
      imports,
    }));

    const platforms: Record<string, number> = {};
    platformMap.forEach((count, platform) => {
      platforms[platform] = count;
    });

    return NextResponse.json({ daily, platforms, range, days });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
