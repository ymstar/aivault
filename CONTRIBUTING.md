# Contributing to AIVault

Thank you for your interest in contributing!

## Development Setup

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/aivault.git
cd aivault

# 2. Install dependencies
npm install

# 3. Copy env template
cp .env.example .env.local
# Fill in your Supabase + Clerk credentials

# 4. Run migrations in Supabase SQL Editor
# - supabase/schema.sql
# - supabase/migrations/002_pgvector.sql (optional)
# - supabase/migrations/003_api_keys.sql

# 5. Start dev server
npm run dev
```

## How to Contribute

### Reporting Bugs

- Use GitHub Issues
- Include steps to reproduce
- Include your environment (OS, Node.js version)

### Suggesting Features

- Open a GitHub Issue with the `enhancement` label
- Describe the use case, not just the solution

### Submitting Code

1. Create a branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run build: `npm run build`
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code restructuring
- `test:` — Tests
- `chore:` — Maintenance

## Architecture Notes

- **Auth:** Clerk handles user authentication. API routes check auth via `auth()` or API key headers.
- **Database:** Supabase (PostgreSQL). Service role key bypasses RLS for server-side operations.
- **Parsers:** Each platform has its own parser in `src/lib/parsers/`. Add new platforms by implementing the `ImportedConversation` interface.
- **Embeddings:** `src/lib/embeddings.ts` handles vector generation. Uses OpenAI API or hash-based fallback.

## Questions?

Open a GitHub Discussion or Issue.
