# AIVault

**Your AI Data. Secured. Unified. Yours.**

All your AI conversations in one place — import, search, and chat with your knowledge base.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?logo=supabase)](https://supabase.com)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

---

## Features

- **Multi-Platform Import** — ChatGPT, Claude, Claude Code, and more
- **Real-Time Collection** — Claude Code Collector automatically captures sessions
- **Knowledge Base** — Chat with your conversations using any LLM (MiMo, OpenAI, etc.)
- **Semantic Search** — Vector embeddings for intelligent context retrieval
- **MCP Server** — Integrate with any AI agent via Model Context Protocol
- **API Key System** — Secure access for external tools
- **Multi-Format Parsing** — JSON, Markdown, and terminal output formats

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/ymstar/aivault.git
cd aivault
npm install
```

### 2. Set Up Services

You need accounts on:
- [Supabase](https://supabase.com) — Database (free tier works)
- [Clerk](https://clerk.com) — Authentication (free tier works)

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your Supabase and Clerk credentials in `.env.local`.

### 4. Set Up Database

Run the SQL migrations in Supabase SQL Editor (in order):
1. `supabase/schema.sql` — Core tables
2. `supabase/migrations/002_pgvector.sql` — Vector search (optional)
3. `supabase/migrations/003_api_keys.sql` — API key authentication

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ymstar/aivault)

1. Connect your GitHub repo
2. Add environment variables from `.env.local`
3. Deploy

## Claude Code Collector

Real-time sync of Claude Code sessions to AIVault:

```bash
cd collector
npm install && npm run build

# Configure
echo 'AIVAULT_API_KEY=your-key' > .env
echo 'AIVAULT_API_URL=https://your-instance.vercel.app' >> .env

# Run
node dist/index.js
```

Generate an API key in AIVault → Settings → API Keys.

## MCP Server

Integrate AIVault with any AI agent:

```json
{
  "mcpServers": {
    "aivault": {
      "command": "node",
      "args": ["path/to/aivault/mcp-server/index.js"],
      "env": {
        "AIVAULT_API_URL": "https://your-instance.vercel.app",
        "AIVAULT_API_KEY": "your-key"
      }
    }
  }
}
```

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **Auth:** Clerk
- **Vector Search:** pgvector (HNSW index)
- **AI:** MiMo, OpenAI compatible APIs

## Project Structure

```
aivault/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # Sign in / Sign up
│   │   ├── (dashboard)/      # Main app pages
│   │   └── api/              # API routes
│   ├── components/           # React components
│   ├── lib/                  # Utilities & services
│   │   ├── parsers/          # ChatGPT, Claude, Claude Code parsers
│   │   ├── embeddings.ts     # Vector embedding generation
│   │   ├── supabase.ts       # Database client
│   │   └── api-keys.ts       # API key management
│   └── middleware.ts         # Auth middleware
├── collector/                # Claude Code session collector (standalone)
├── mcp-server/               # MCP server for agent integration
├── supabase/
│   └── migrations/           # Database migrations
└── docs/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[Apache License 2.0](LICENSE)
