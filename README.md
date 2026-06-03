<div align="center">

# 🏛️ AIVault

### **Your AI Data. Secured. Unified. Yours.**

All your AI conversations in one place — import, search, and chat with your knowledge base.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Deploy](https://img.shields.io/badge/Deploy%20to-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

<br/>

[Features](#-features) · [Quick Start](#-quick-start) · [Deploy](#-deploy-to-vercel) · [Architecture](#-architecture) · [Contributing](#-contributing)

</div>

---

## 🎯 Why AIVault?

You chat with AI every day — ChatGPT, Claude, Gemini, MiMo. Your conversations contain **valuable knowledge**: code solutions, project decisions, research insights. But they're trapped in silos.

**AIVault** liberates your AI data:

- 📥 **Import** conversations from any AI platform
- 🔍 **Search** across everything with semantic vector search
- 💬 **Chat** with your knowledge base using any LLM
- 🤖 **Collect** Claude Code sessions automatically
- 🔌 **Integrate** with any AI agent via MCP protocol

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📥 Multi-Platform Import
Upload ChatGPT JSON exports, Claude conversations, Claude Code terminal sessions. Auto-detect format, batch import.

### 🔍 Semantic Search
Powered by pgvector embeddings. Ask natural language questions — find the conversation that matters, not just keyword matches.

### 💬 Knowledge Base Chat
Chat with your conversations using any OpenAI/Anthropic compatible LLM. Configure API key and model per session.

</td>
<td width="50%">

### 🤖 Real-Time Collection
Claude Code Collector watches `~/.claude/projects/` and syncs sessions to AIVault in real-time. Zero manual effort.

### 🔌 MCP Server
Model Context Protocol integration — connect AIVault to Claude Desktop, Cursor, or any MCP-compatible agent.

### 🔑 API Key System
Generate API keys for external tools. Collector, MCP, or your own scripts — all authenticated through AIVault.

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **[Supabase](https://supabase.com)** account (free tier works)
- **[Clerk](https://clerk.com)** account (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/aivault-org/aivault.git
cd aivault
npm install
```

### 2. Set Up Services

**Supabase** — Create a project at [supabase.com](https://supabase.com)

**Clerk** — Create an application at [clerk.com](https://clerk.com)

### 3. Configure

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# Supabase (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk (API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 4. Database Setup

Run these SQL files in **Supabase SQL Editor** (Dashboard → SQL Editor):

```sql
-- 1. Core tables (users, conversations, messages, subscriptions)
--    → Paste contents of supabase/schema.sql

-- 2. Vector search (optional, for RAG)
--    → Paste contents of supabase/migrations/002_pgvector.sql

-- 3. API key authentication
--    → Paste contents of supabase/migrations/003_api_keys.sql
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## ☁️ Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aivault-org/aivault)

1. Click the button above (or connect repo manually)
2. Add environment variables from `.env.local`
3. Deploy — done!

Every `git push` auto-deploys.

---

## 🤖 Claude Code Collector

Automatically sync Claude Code sessions to AIVault:

```bash
cd collector
npm install && npm run build
```

Configure:

```bash
# collector/.env
AIVAULT_API_URL=https://your-aivault.vercel.app
AIVAULT_API_KEY=av_xxxxx         # Generate in Settings → API Keys
```

Run:

```bash
node dist/index.js
```

```
╔═══════════════════════════════════════╗
║    AIVault — Claude Code Collector     ║
╚═══════════════════════════════════════╝

✓ Syncing as user you@example.com
👁 Watching: ~/.claude/projects
Found 11 existing session files
✓ Initial scan: 7 synced, 0 skipped
✓ Watcher active — collecting new sessions in real-time
```

The collector monitors `~/.claude/projects/` and syncs new conversations in real-time. No manual export needed.

---

## 🔌 MCP Server

AIVault 提供独立的 MCP Server 包，可连接任何兼容 MCP 协议的 Agent：

```json
{
  "mcpServers": {
    "aivault": {
      "command": "npx",
      "args": ["-y", "@aivault/aivault-mcp-server"],
      "env": {
        "AIVAULT_URL": "https://your-aivault.vercel.app",
        "AIVAULT_API_KEY": "av_xxxxxxxx"
      }
    }
  }
}
```

详见 [@aivault/aivault-mcp-server](https://github.com/aivault-org/aivault-mcp-server)。

**可用工具：**
- `search_conversations` — 搜索对话（关键词 / 语义）
- `get_conversation` — 获取完整对话详情
- `list_conversations` — 列出最近对话
- `get_stats` — 获取统计信息
- `register_agent` — 注册 Agent 到 Dashboard
- `sync_conversation` — 同步对话到知识库
- `heartbeat` — 心跳保活

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AIVault App                       │
│              Next.js 15 + TypeScript                │
├─────────────┬───────────────┬───────────────────────┤
│   Frontend  │   API Routes  │    Middleware          │
│  (React 19) │  (/api/*)     │   (Clerk Auth)        │
├─────────────┴───────────────┴───────────────────────┤
│                      ↓                               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Supabase │  │  Clerk   │  │   LLM APIs        │  │
│  │ Postgres │  │  Auth    │  │ MiMo / OpenAI /    │  │
│  │ + pgvector│  │          │  │ Anthropic          │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
├─────────────────────────────────────────────────────┤
│  External Tools                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │   Collector   │  │  MCP Server  │                 │
│  │ (Claude Code) │  │ (Agents)     │                 │
│  └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
aivault/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Sign in / Sign up pages
│   │   ├── (dashboard)/        # Main app pages
│   │   │   ├── chat/           # AI chat with knowledge base
│   │   │   ├── conversations/  # Browse imported conversations
│   │   │   ├── import/         # File upload & import
│   │   │   ├── search/         # Full-text & semantic search
│   │   │   └── settings/       # Account & API key management
│   │   └── api/                # REST API endpoints
│   ├── components/             # Reusable UI components
│   ├── lib/                    # Core libraries
│   │   ├── parsers/            # ChatGPT, Claude, Claude Code parsers
│   │   ├── embeddings.ts       # Vector embedding generation
│   │   ├── supabase.ts         # Database client
│   │   ├── auth.ts             # Auth utilities
│   │   └── api-keys.ts         # API key management
│   └── middleware.ts           # Clerk auth middleware
├── collector/                  # Claude Code session collector
├── supabase/
│   ├── schema.sql              # Core database schema
│   └── migrations/             # pgvector & API keys
└── docs/                       # Documentation
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Vector Search | pgvector (HNSW index) |
| Auth | Clerk |
| AI/LLM | MiMo, OpenAI, Anthropic compatible |
| Deploy | Vercel |

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code conventions
- Pull request process

---

## 📄 License

[Apache License 2.0](LICENSE) — free for personal and commercial use.

---

<div align="center">

**Built with ❤️ for the AI era**

[⬆ Back to top](#-aivault)

</div>
