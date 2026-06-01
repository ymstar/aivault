import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiKey = process.env.OPENAI_API_KEY;

/**
 * Generate embedding vector for a given text.
 * Uses OpenAI text-embedding-3-small if OPENAI_API_KEY is set,
 * otherwise uses a simple hash-based fallback (for dev/testing).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  
  if (openaiKey) {
    return generateOpenAIEmbedding(truncated);
  }
  
  // Fallback: deterministic hash-based pseudo-embedding
  // NOT suitable for production — just for testing without an embedding API key
  return generateHashEmbedding(truncated);
}

/**
 * Batch generate embeddings for multiple texts.
 * OpenAI supports batching up to 100 texts per request.
 */
export async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const truncated = texts.map(t => t.slice(0, 8000));
  
  if (openaiKey) {
    return batchOpenAIEmbeddings(truncated);
  }
  
  return truncated.map(t => generateHashEmbedding(t));
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function batchOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  
  // Process in batches of 100
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: batch,
        dimensions: 1536,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI batch embedding error: ${err}`);
    }

    const data = await res.json();
    // Sort by index since OpenAI may not return in order
    const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
    results.push(...sorted.map((d: any) => d.embedding));
  }

  return results;
}

/**
 * Simple hash-based pseudo-embedding for development/testing.
 * Produces a deterministic 1536-dim vector from text.
 * NOT semantically meaningful — just for testing the RAG pipeline.
 */
function generateHashEmbedding(text: string): number[] {
  const dim = 1536;
  const vec = new Float32Array(dim);
  
  // Simple hash: use character codes to seed the vector
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    vec[i % dim] += code * 0.001;
    vec[(i * 7 + 13) % dim] += Math.sin(code * 0.1) * 0.5;
  }
  
  // Normalize to unit vector
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) {
    vec[i] /= norm;
  }
  
  return Array.from(vec);
}

/**
 * Search for similar content using vector similarity.
 */
export async function searchSimilar(
  queryEmbedding: number[],
  userId: string,
  limit: number = 10
) {
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: limit,
  });

  if (error) {
    console.error('Vector search error:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if pgvector/embeddings are available.
 */
export async function isEmbeddingReady(): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { count, error } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}
