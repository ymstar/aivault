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
    const format = sp.get('format') || 'json';
    const idsParam = sp.get('ids');
    const platform = sp.get('platform');
    const tagsParam = sp.get('tags');

    let query = supabase
      .from('conversations')
      .select('id, title, platform, tags, created_at, messages(role, content, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        query = query.in('id', ids);
      }
    } else {
      if (platform) query = query.eq('platform', platform as 'CHATGPT' | 'CLAUDE' | 'GEMINI' | 'OTHER');
      if (tagsParam) {
        const tagList = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
        if (tagList.length > 0) query = query.overlaps('tags', tagList);
      }
    }

    // Limit to 500 conversations to avoid excessive output
    query = query.limit(500);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const conversations = data || [];

    // Sort messages by created_at
    conversations.forEach((conv) => {
      if (conv.messages && Array.isArray(conv.messages)) {
        conv.messages.sort((a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    });

    if (format === 'json') {
      const output = JSON.stringify({ exported_at: new Date().toISOString(), conversations }, null, 2);
      return new NextResponse(output, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="aivault-export-${Date.now()}.json"`,
        },
      });
    }

    if (format === 'markdown') {
      const lines: string[] = ['# AIVault Export', `> Exported: ${new Date().toISOString()}\n`];

      for (const conv of conversations) {
        lines.push(`## ${conv.title}`);
        lines.push(`> Platform: ${conv.platform} | Tags: ${(conv.tags || []).join(', ') || 'none'} | Date: ${new Date(conv.created_at).toLocaleString()}\n`);

        for (const msg of (conv.messages || [])) {
          lines.push(`### ${msg.role}`);
          lines.push(`${msg.content}\n`);
        }
        lines.push('---\n');
      }

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="aivault-export-${Date.now()}.md"`,
        },
      });
    }

    if (format === 'csv') {
      const rows: string[] = ['conversation_id,title,platform,role,content,created_at,tags'];

      const csvEscape = (s: string) => `"${(s || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;

      for (const conv of conversations) {
        for (const msg of (conv.messages || [])) {
          rows.push(
            [
              conv.id,
              csvEscape(conv.title),
              conv.platform,
              msg.role,
              csvEscape(msg.content),
              msg.created_at,
              csvEscape((conv.tags || []).join(';')),
            ].join(',')
          );
        }
      }

      return new NextResponse(rows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="aivault-export-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: `Unsupported format: ${format}. Use json, markdown, or csv.` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
