import { NextResponse } from 'next/server';
import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { decryptApiKey } from '@/lib/crypto';
import { createProvider, streamCompletion } from '@/lib/llm';
import type { ChatMessage } from '@/lib/llm';
import { retrieveRAGContext, type RAGSource } from '@/lib/rag';

export async function POST(req: Request) {
  const userId = await getDbUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { message?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, sessionId } = body;
  if (!message?.trim() || !sessionId) {
    return new Response(JSON.stringify({ error: 'message and sessionId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createServerClient();

  // Load session and verify ownership
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, user_id, title, provider_id, model_override, rag_enabled')
    .eq('id', sessionId)
    .single();

  if (!session || session.user_id !== userId) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Load LLM config
  let configId: string | null = session.provider_id ?? null;
  if (!configId) {
    const { data: defaultConfig } = await supabase
      .from('user_llm_configs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (defaultConfig) {
      configId = defaultConfig.id;
    } else {
      const { data: firstConfig } = await supabase
        .from('user_llm_configs')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      configId = firstConfig?.id ?? null;
    }
  }

  if (!configId) {
    return new Response(JSON.stringify({ error: 'NO_LLM_CONFIG', message: 'Please configure an LLM provider first.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: llmConfig } = await supabase
    .from('user_llm_configs')
    .select('*')
    .eq('id', configId)
    .eq('user_id', userId)
    .single();

  if (!llmConfig) {
    return new Response(JSON.stringify({ error: 'LLM config not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Save user message
  const { error: insertErr } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: message.trim(),
  });
  if (insertErr) {
    console.error('Failed to save user message:', insertErr);
    return new Response(JSON.stringify({ error: 'Failed to save message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch multi-turn history (last 20 messages)
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  const messages: ChatMessage[] = (history || []).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  // Build system prompt with RAG context
  let systemPrompt = 'You are AIVault AI assistant. You help users understand and explore their AI conversation history. Answer questions clearly and concisely.';

  let ragSources: RAGSource[] = [];

  if (session.rag_enabled) {
    const ragResult = await retrieveRAGContext(userId, message.trim());
    if (ragResult.context) {
      systemPrompt += `\n\nThe following is relevant context from the user's imported AI conversations:\n\n${ragResult.context}`;
    }
    ragSources = ragResult.sources;
  }

  // Create provider and stream
  try {
    const apiKey = decryptApiKey(llmConfig.api_key_encrypted, llmConfig.api_key_iv, llmConfig.api_key_tag);
    const provider = createProvider({
      providerType: llmConfig.provider_type,
      baseUrl: llmConfig.base_url,
      apiKey,
      model: session.model_override || llmConfig.model,
    });

    const tokenStream = await streamCompletion(provider, messages, systemPrompt);
    const reader = tokenStream.getReader();
    const encoder = new TextEncoder();
    let assistantContent = '';

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          // Save assistant message after stream completes
          const { data: savedMsg, error: saveErr } = await supabase
            .from('chat_messages')
            .insert({
              session_id: sessionId,
              role: 'assistant',
              content: assistantContent,
              metadata: { model: session.model_override || llmConfig.model, provider: llmConfig.label },
            })
            .select('id')
            .single();

          if (saveErr) {
            console.error('Failed to save assistant message:', saveErr);
          }

          // Auto-title: if title is still "New Chat", use first ~50 chars of user message
          if (session.title === 'New Chat') {
            const title = message.trim().slice(0, 50) + (message.trim().length > 50 ? '...' : '');
            await supabase
              .from('chat_sessions')
              .update({ title })
              .eq('id', sessionId);
          }

          // Send sources before [DONE] if available
          if (ragSources.length > 0) {
            const sourcesPayload = JSON.stringify({ type: 'sources', sources: ragSources });
            controller.enqueue(encoder.encode(`data: ${sourcesPayload}\n\n`));
          }

          const donePayload = JSON.stringify({ type: 'done', messageId: savedMsg?.id });
          controller.enqueue(encoder.encode(`data: ${donePayload}\n\n`));
          controller.close();
          return;
        }

        assistantContent += value;
        const tokenPayload = JSON.stringify({ type: 'token', content: value });
        controller.enqueue(encoder.encode(`data: ${tokenPayload}\n\n`));
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to get LLM response' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
