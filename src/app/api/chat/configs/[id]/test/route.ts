import { NextResponse } from 'next/server';
import { getDbUserId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { decryptApiKey } from '@/lib/crypto';
import { createProvider } from '@/lib/llm';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: config } = await supabase
    .from('user_llm_configs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

  try {
    const apiKey = decryptApiKey(config.api_key_encrypted, config.api_key_iv, config.api_key_tag);
    const provider = createProvider({
      providerType: config.provider_type,
      baseUrl: config.base_url,
      apiKey,
      model: config.model,
    });

    // Send a minimal test request
    const payload = provider.buildPayload(
      [{ role: 'user', content: 'Hi' }],
      'Reply with exactly: OK',
      10,
    );

    const response = await fetch(provider.getEndpoint(), {
      method: 'POST',
      headers: provider.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `API returned ${response.status}: ${errText.slice(0, 200)}` });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    });
  }
}
