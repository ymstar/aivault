import { NextResponse } from 'next/server';
import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';

  const supabase = createServerClient();

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at, message_count')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  if (format === 'markdown') {
    const lines = [
      `# ${session.title}`,
      `*Created: ${new Date(session.created_at).toLocaleString()}*`,
      '',
      '---',
      '',
    ];

    for (const msg of messages || []) {
      const roleLabel = msg.role === 'user' ? '## User' : msg.role === 'assistant' ? '## Assistant' : '## System';
      lines.push(roleLabel);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`,
      },
    });
  }

  // JSON format
  const exportData = {
    session: {
      title: session.title,
      created_at: session.created_at,
      message_count: session.message_count,
    },
    messages: (messages || []).map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.json"`,
    },
  });
}
