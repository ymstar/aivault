import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getDbUserId } from '@/lib/auth';
import { parseExport } from '@/lib/parsers';
import type { ImportedConversation } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const platform = formData.get('platform');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!platform || typeof platform !== 'string') {
      return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
    }

    const validPlatforms = ['chatgpt', 'claude', 'claude-code'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 },
      );
    }

    const filename = file.name || '';
    const text = await file.text();
    
    // Determine how to parse based on file extension and platform
    let rawData: unknown;
    const isTextFile = filename.endsWith('.txt') || filename.endsWith('.md');
    
    if (platform === 'claude-code' || (platform === 'claude' && isTextFile)) {
      // Claude Code exports are txt/md files - pass as string
      rawData = text;
    } else {
      // JSON files for ChatGPT and Claude web exports
      try {
        rawData = JSON.parse(text);
      } catch {
        return NextResponse.json({ 
          error: 'Invalid JSON file. For Claude Code terminal exports, please select "Claude Code" as the platform.' 
        }, { status: 400 });
      }
    }

    // Pass raw data to parser - it handles both array and object formats
    const conversations: ImportedConversation[] = parseExport(platform, rawData, filename);

    const supabase = createServerClient();
    let totalMessages = 0;

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
        .select('id')
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

      totalMessages += conv.messages.length;
    }

    return NextResponse.json({
      success: true,
      conversations: conversations.length,
      messages: totalMessages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
