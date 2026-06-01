-- 004: Chat sessions, messages, and user LLM configs

-- Utility function for auto-updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User LLM configurations (encrypted API keys)
CREATE TABLE IF NOT EXISTS user_llm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('openai_compatible', 'anthropic')),
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_key_iv TEXT NOT NULL,
  api_key_tag TEXT NOT NULL,
  api_key_prefix TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_llm_configs_user ON user_llm_configs(user_id, is_default DESC);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  provider_id UUID REFERENCES user_llm_configs(id) ON DELETE SET NULL,
  model_override TEXT,
  rag_enabled BOOLEAN NOT NULL DEFAULT true,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at ASC);

-- RLS
ALTER TABLE user_llm_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage user_llm_configs" ON user_llm_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at and message_count on chat_sessions when a message is inserted
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now(), message_count = message_count + 1 WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_session_on_message();

-- Auto-update updated_at on user_llm_configs
CREATE TRIGGER trigger_user_llm_configs_updated_at
  BEFORE UPDATE ON user_llm_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
