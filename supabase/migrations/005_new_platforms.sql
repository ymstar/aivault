-- Migration: Add new platform types for Codex, Cursor, OpenCode, Hermes
-- Run this in Supabase SQL Editor after 004_chat_sessions.sql

-- Drop existing CHECK constraint and add updated one
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_platform_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_platform_check
  CHECK (platform IN ('CHATGPT', 'CLAUDE', 'GEMINI', 'CODEX', 'CURSOR', 'OPENCODE', 'HERMES', 'OTHER'));

ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_platform_check;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_platform_check
  CHECK (platform IN ('CHATGPT', 'CLAUDE', 'GEMINI', 'CODEX', 'CURSOR', 'OPENCODE', 'HERMES', 'OTHER'));
