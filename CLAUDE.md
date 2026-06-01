# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is AIVault

AI data sovereignty platform — import conversations from ChatGPT/Claude/Claude Code, search them with semantic vector search (pgvector), and chat with your knowledge base using any LLM. Also includes a Claude Code session collector and an MCP server for agent integration.

## Commands

```bash
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run lint         # ESLint (flat config, eslint-config-next)
```

No test suite exists yet.

## Important: Next.js Version

This runs **Next.js 16** (not 14/15). Breaking changes may exist. Check `node_modules/next/dist/docs/` before writing code. See AGENTS.md.

## Architecture

**Stack**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase (PostgreSQL) + Clerk auth + Stripe subscriptions.

### Auth Flow

1. Clerk handles authentication (sign-in/sign-up via `@clerk/nextjs`)
2. Middleware (`src/middleware.ts`) protects all routes except `/`, `/sign-in/*`, `/sign-up/*`, and `/api/stripe/webhook`
3. API routes call `auth()` from `@clerk/nextjs/server` to get the Clerk user ID
4. `src/lib/auth.ts:getDbUserId()` maps Clerk ID → Supabase user UUID (auto-creates user if missing)
5. External tools (collector, MCP) authenticate via API keys (`src/lib/api-keys.ts`) — keys are `av_` prefixed, SHA-256 hashed in DB

### Database

All database access via `@supabase/supabase-js`. Schema defined in `supabase/schema.sql` + `supabase/migrations/` — run these in Supabase SQL Editor. RLS policies are defined there.

- Server-side: `createServerClient()` from `src/lib/supabase.ts` (service role key, bypasses RLS)
- Client-side: the anon key export from the same file

### Parsers

`src/lib/parsers/` converts platform exports into a common `ImportedConversation` type:
- `chatgpt.ts` — JSON array export
- `claude.ts` — JSON export
- `claude-code.ts` — txt/md terminal session export
- `index.ts` — `parseExport(platform, data, filename)` dispatcher

Add new platforms by implementing a parser that returns `ImportedConversation[]`.

### Embeddings / RAG

`src/lib/embeddings.ts` generates 1536-dim vectors via OpenAI `text-embedding-3-small`. Falls back to a hash-based pseudo-embedding for dev without an API key. Vector search uses Supabase's `match_embeddings` RPC (requires pgvector migration).

### External Components

- **`collector/`** — Standalone Node.js tool. Watches `~/.claude/projects/` for Claude Code sessions and syncs them to AIVault via the `/api/collector/sync` endpoint. Has its own `package.json`.
- **`mcp-server/`** — MCP (Model Context Protocol) server. Connects AIVault to Claude Desktop, Cursor, or any MCP-compatible agent. Provides `search_conversations`, `get_conversation`, `list_conversations`, `get_stats` tools.

## Environment Variables

Required (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `OPENAI_API_KEY` — optional, enables real embeddings (otherwise uses hash fallback)

## Code Conventions

- Server Components by default; add `"use client"` only when needed
- Tailwind CSS only — no CSS modules
- Path alias: `@/` maps to `src/`
- API routes in `src/app/api/` — each route exports `GET`/`POST`/etc. handlers
- Shared types in `src/types/index.ts`
- UI components from shadcn/ui in `src/components/ui/`
