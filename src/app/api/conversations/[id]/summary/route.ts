import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getDbUserId } from '@/lib/auth';
import { decryptApiKey } from '@/lib/crypto';
import { generateCompletion } from '@/lib/llm/generate';
import type { LLMConfig } from '@/lib/llm/types';

const SUMMARY_PROMPT = `You are a conversation summarizer. Given a conversation between a user and an AI assistant, produce a concise summary in the following format:

**Topic:** [1-3 word topic label]
**Summary:** [2-3 sentence summary of what was discussed and the outcome]
**Key Points:** [bullet list of 2-4 key takeaways]

Keep it factual and concise. Do not include meta-commentary.`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getDbUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Verify ownership and get conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, title, summary')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch messages
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages in conversation' }, { status: 400 });
    }

    // Get user's default LLM config
    const { data: llmConfig } = await supabase
      .from('user_llm_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (!llmConfig) {
      // Try first available config
      const { data: fallback } = await supabase
        .from('user_llm_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!fallback) {
        return NextResponse.json(
          { error: 'NO_LLM_CONFIG', message: 'Please configure an LLM provider first.' },
          { status: 400 },
        );
      }

      return generateAndSave(supabase, userId, id, messages, fallback);
    }

    return generateAndSave(supabase, userId, id, messages, llmConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generateAndSave(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  convId: string,
  messages: Array<{ role: string; content: string }>,
  dbConfig: Record<string, unknown>,
) {
  const apiKey = decryptApiKey(
    dbConfig.api_key_encrypted as string,
    dbConfig.api_key_iv as string,
    dbConfig.api_key_tag as string,
  );

  const config: LLMConfig = {
    providerType: dbConfig.provider_type as 'openai_compatible' | 'anthropic',
    baseUrl: dbConfig.base_url as string,
    apiKey,
    model: dbConfig.model as string,
  };

  // Build conversation text (truncate if very long)
  const convText = messages
    .map((m) => `${m.role}: ${m.content.slice(0, 2000)}`)
    .join('\n\n')
    .slice(0, 12000);

  const summary = await generateCompletion(
    config,
    [{ role: 'user', content: convText }],
    SUMMARY_PROMPT,
    512,
  );

  // Save to DB
  const { error: updateErr } = await supabase
    .from('conversations')
    .update({ summary })
    .eq('id', convId);

  if (updateErr) {
    console.error('Failed to save summary:', updateErr);
  }

  return NextResponse.json({ summary });
}

// GET endpoint to retrieve existing summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getDbUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: conv, error } = await supabase
      .from('conversations')
      .select('id, summary')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ summary: conv.summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
