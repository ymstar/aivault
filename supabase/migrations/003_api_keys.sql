-- AIVault: API Keys for external tool authentication (collector, MCP, etc.)
-- Run this in Supabase SQL Editor

-- 1. API keys table
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,          -- first 8 chars for display: "av_xxxx...xxxx"
  name text not null default 'default',
  last_used_at timestamptz,
  created_at timestamptz default now()
);

-- 2. Indexes
create index if not exists idx_api_keys_hash on api_keys(key_hash);
create index if not exists idx_api_keys_user on api_keys(user_id);

-- 3. RLS
alter table api_keys enable row level security;

create policy "Service role can manage api_keys"
  on api_keys for all
  using (true) with check (true);
