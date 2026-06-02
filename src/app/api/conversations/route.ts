import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getDbUserId } from '@/lib/auth';
import type { ImportedConversation } from '@/types';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  const userId = await getDbUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 20));
    const platform = sp.get('platform');
    const query = sp.get('q');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (platform) {
      dbQuery = dbQuery.eq('platform', platform as Database['public']['Enums']['Platform']);
    }
    if (query) {
      // Search in title OR message content
      const escaped = query.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      
      // First find conversation IDs that have matching messages (scoped to user)
      const { data: userConvIds } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId);
      const userConvIdSet = (userConvIds || []).map(c => c.id);

      const { data: matchingMsgs } = userConvIdSet.length > 0
        ? await supabase
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', userConvIdSet)
            .ilike('content', `%${escaped}%`)
            .limit(100)
        : { data: [] };
      
      const matchConvIds = [...new Set((matchingMsgs || []).map(m => m.conversation_id))];
      
      if (matchConvIds.length > 0) {
        dbQuery = dbQuery.or(`title.ilike.%${escaped}%,id.in.(${matchConvIds.join(',')})`);
      } else {
        dbQuery = dbQuery.ilike('title', `%${escaped}%`);
      }
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count ?? 0;

    return NextResponse.json({
      items: data ?? [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getDbUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const body = await request.json();
    const conversations: ImportedConversation[] = Array.isArray(body) ? body : [body];

    // Validate input
    for (const conv of conversations) {
      if (!conv.platform || !conv.title || !Array.isArray(conv.messages)) {
        return NextResponse.json(
          { error: 'Each conversation must have platform, title, and messages[]' },
          { status: 400 }
        );
      }
    }

    const created: Array<Record<string, unknown>> = [];

    for (const conv of conversations) {
      const { data: insertedConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          platform: conv.platform,
          title: conv.title,
          created_at: conv.createdAt ?? new Date().toISOString(),
          message_count: conv.messages.length,
        })
        .select()
        .single();

      if (convError) {
        return NextResponse.json({ error: convError.message }, { status: 500 });
      }

      if (conv.messages.length > 0 && insertedConv) {
        const messagesToInsert = conv.messages.map((msg) => ({
          conversation_id: insertedConv.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.createdAt ?? new Date().toISOString(),
        }));

        const { error: msgError } = await supabase
          .from('messages')
          .insert(messagesToInsert);

        if (msgError) {
          return NextResponse.json({ error: msgError.message }, { status: 500 });
        }
      }

      created.push(insertedConv);
    }

    return NextResponse.json({ success: true, created: created.length, items: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
