import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-keys';

/**
 * GET /api/collector — Health check for collectors.
 * Auth: API key in Authorization header (Bearer av_xxx).
 * Returns 200 if the key is valid, 401 otherwise.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!apiKey || !apiKey.startsWith('av_')) {
    return NextResponse.json(
      { error: 'Missing or invalid API key' },
      { status: 401 }
    );
  }

  const userId = await validateApiKey(apiKey);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
