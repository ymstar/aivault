-- 006_collector_agents.sql
-- Stores registered collector agents that auto-sync conversations to AIVault.

CREATE TABLE IF NOT EXISTS collector_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL,
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'online',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collector_agents_user_id ON collector_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_collector_agents_agent_id ON collector_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_collector_agents_last_seen ON collector_agents(last_seen);
