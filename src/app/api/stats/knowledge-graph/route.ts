import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getDbUserId } from '@/lib/auth';
import { isEmbeddingReady } from '@/lib/embeddings';

interface ConversationNode {
  id: string;
  title: string;
  platform: string;
  messageCount: number;
  x: number;
  y: number;
  cluster: number;
  summary: string | null;
}

interface ClusterInfo {
  id: number;
  label: string;
  count: number;
}

/**
 * Simple 2D projection using random projection.
 * More principled than picking first 2 dimensions, cheaper than full PCA.
 */
function projectTo2D(embeddings: number[][]): [number, number][] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;

  // Use a fixed seed for deterministic results
  const seed = 42;
  const rng = mulberry32(seed);

  // Generate random projection matrix (dim x 2)
  const projMatrix: [number, number][] = [];
  for (let i = 0; i < dim; i++) {
    projMatrix.push([(rng() - 0.5) * 2, (rng() - 0.5) * 2]);
  }

  // Project each embedding
  return embeddings.map((emb) => {
    let x = 0, y = 0;
    for (let i = 0; i < dim; i++) {
      x += emb[i] * projMatrix[i][0];
      y += emb[i] * projMatrix[i][1];
    }
    return [x, y];
  });
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple k-means-like clustering by platform.
 */
function clusterByPlatform(platforms: string[]): number[] {
  const unique = [...new Set(platforms)];
  return platforms.map((p) => unique.indexOf(p));
}

export async function GET() {
  const userId = await getDbUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Check if embeddings are available
    const ready = await isEmbeddingReady();
    if (!ready) {
      // Return conversations without embedding-based positioning
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, title, platform, message_count, summary')
        .eq('user_id', userId)
        .limit(200);

      const nodes: ConversationNode[] = (convs || []).map((c, i) => ({
        id: c.id,
        title: c.title,
        platform: c.platform,
        messageCount: c.message_count,
        x: Math.cos(i * 2.399) * 100, // golden angle spiral
        y: Math.sin(i * 2.399) * 100,
        cluster: 0,
        summary: c.summary,
      }));

      return NextResponse.json({ nodes, clusters: [], fallback: true });
    }

    // Fetch conversations with embeddings
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, title, platform, message_count, summary')
      .eq('user_id', userId)
      .limit(200);

    if (!convs || convs.length === 0) {
      return NextResponse.json({ nodes: [], clusters: [] });
    }

    const convIds = convs.map((c) => c.id);

    // Fetch embeddings grouped by conversation
    const { data: embData } = await supabase
      .from('embeddings')
      .select('conversation_id, embedding')
      .in('conversation_id', convIds);

    if (!embData || embData.length === 0) {
      // No embeddings yet — fallback layout
      const nodes: ConversationNode[] = convs.map((c, i) => ({
        id: c.id,
        title: c.title,
        platform: c.platform,
        messageCount: c.message_count,
        x: Math.cos(i * 2.399) * 100,
        y: Math.sin(i * 2.399) * 100,
        cluster: 0,
        summary: c.summary,
      }));
      return NextResponse.json({ nodes, clusters: [], fallback: true });
    }

    // Average embeddings per conversation
    const embMap = new Map<string, number[][]>();
    for (const row of embData) {
      const vec = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
      if (!Array.isArray(vec) || !row.conversation_id) continue;
      if (!embMap.has(row.conversation_id)) {
        embMap.set(row.conversation_id, []);
      }
      embMap.get(row.conversation_id)!.push(vec);
    }

    // Compute average embedding per conversation
    const avgEmbeddings: number[][] = [];
    const validConvs: typeof convs = [];

    for (const conv of convs) {
      const vecs = embMap.get(conv.id);
      if (!vecs || vecs.length === 0) continue;

      const dim = vecs[0].length;
      const avg = new Array(dim).fill(0);
      for (const v of vecs) {
        for (let i = 0; i < dim; i++) avg[i] += v[i];
      }
      for (let i = 0; i < dim; i++) avg[i] /= vecs.length;
      avgEmbeddings.push(avg);
      validConvs.push(conv);
    }

    if (validConvs.length === 0) {
      return NextResponse.json({ nodes: [], clusters: [] });
    }

    // Project to 2D
    const coords = projectTo2D(avgEmbeddings);

    // Normalize coordinates to [-200, 200]
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of coords) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const platforms = validConvs.map((c) => c.platform);
    const clusterIds = clusterByPlatform(platforms);
    const uniquePlatforms = [...new Set(platforms)];

    const nodes: ConversationNode[] = validConvs.map((conv, i) => ({
      id: conv.id,
      title: conv.title,
      platform: conv.platform,
      messageCount: conv.message_count,
      x: ((coords[i][0] - minX) / rangeX - 0.5) * 400,
      y: ((coords[i][1] - minY) / rangeY - 0.5) * 400,
      cluster: clusterIds[i],
      summary: conv.summary,
    }));

    const clusters: ClusterInfo[] = uniquePlatforms.map((p, i) => ({
      id: i,
      label: p,
      count: platforms.filter((pp) => pp === p).length,
    }));

    return NextResponse.json({ nodes, clusters });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
