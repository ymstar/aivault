-- AIVault RAG: pgvector + embeddings for semantic search
-- Run this in Supabase SQL Editor

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Embeddings table
create table if not exists embeddings (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- 3. Indexes
create index if not exists idx_embeddings_user on embeddings(user_id);
create index if not exists idx_embeddings_conversation on embeddings(conversation_id);
create index if not exists idx_embeddings_message on embeddings(message_id);

-- 4. HNSW index for fast approximate nearest neighbor search
create index if not exists idx_embeddings_vector 
  on embeddings using hnsw (embedding vector_cosine_ops);

-- 5. Vector similarity search function
create or replace function match_embeddings(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 10
)
returns table (
  id uuid,
  message_id uuid,
  conversation_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.message_id,
    e.conversation_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  where e.user_id = match_user_id
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 6. RLS policies
alter table embeddings enable row level security;

-- Allow service role full access
create policy "Service role can manage embeddings"
  on embeddings
  for all
  using (true)
  with check (true);
