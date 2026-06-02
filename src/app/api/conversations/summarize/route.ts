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

/**
 * POST /api/conversations/summarize
 * Body: { ids?: string[] } — if omitted, summarize all conversations without summaries
 */
export async function POST(request: NextRequest) {
  const userId = await getDbUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const body = await request.json().catch(() => ({}));
    const { ids } = body as { ids?: string[] };

    // Get user's LLM config
    let { data: llmConfig } = await supabase
      .from('user_llm_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (!llmConfig) {
      const { data: fallback } = await supabase
        .from('user_llm_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      llmConfig = fallback;
    }

    if (!llmConfig) {
      return NextResponse.json(
        { error: 'NO_LLM_CONFIG', message: 'Please configure an LLM provider first.' },
        { status: 400 },
      );
    }

    const apiKey = decryptApiKey(
      llmConfig.api_key_encrypted,
      llmConfig.api_key_iv,
      llmConfig.api_key_tag,
    );

    const config: LLMConfig = {
      providerType: llmConfig.provider_type,
      baseUrl: llmConfig.base_url,
      apiKey,
      model: llmConfig.model,
    };

    // Fetch conversations to summarize
    let convQuery = supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (ids && ids.length > 0) {
      convQuery = convQuery.in('id', ids);
    } else {
      convQuery = convQuery.is('summary', null);
    }

    const { data: convs } = await convQuery.limit(20);
    if (!convs || convs.length === 0) {
      return NextResponse.json({ summarized: 0, message: 'No conversations to summarize' });
    }

    let summarized = 0;
    let errors = 0;

    for (const conv of convs) {
      try {
        const { data: messages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (!messages || messages.length === 0) continue;

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

        await supabase.from('conversations').update({ summary }).eq('id', conv.id);
        summarized++;
      } catch (err) {
        console.error(`Summary failed for ${conv.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ summarized, errors, total: convs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
