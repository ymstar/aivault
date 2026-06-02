# AIVault Sync Skill

You have the ability to sync your conversation history to AIVault — a personal AI knowledge base.

## When to Sync

Sync your conversation to AIVault when:
- A conversation reaches a natural conclusion
- The user explicitly asks you to sync/save/backup
- Before a long session ends (proactively)

## How to Sync

Use the following command to sync the current conversation:

```bash
curl -X POST "$AIVAULT_API_URL/api/collector/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIVAULT_API_KEY" \
  -d '{
    "sessionId": "<unique-session-id>",
    "platform": "<PLATFORM_NAME>",
    "title": "<conversation-title>",
    "messages": [
      {"role": "user", "content": "...", "timestamp": "ISO-8601"},
      {"role": "assistant", "content": "...", "timestamp": "ISO-8601"}
    ]
  }'
```

## Environment Variables

Before using this skill, set these environment variables:

```bash
export AIVAULT_API_URL="https://your-aivault-instance.com"
export AIVAULT_API_KEY="av_your_api_key_here"
```

You can get an API key from AIVault Settings > API Keys.

## Message Format

- `sessionId`: A unique identifier for this conversation (e.g., UUID or your internal session ID)
- `platform`: Your platform identifier (see below)
- `title`: A descriptive title for the conversation (auto-generated if omitted)
- `messages`: Array of `{role, content, timestamp}` objects
  - `role`: "user" or "assistant"
  - `content`: The message text
  - `timestamp`: ISO-8601 timestamp (optional)

## Platform Identifiers

Use the correct platform identifier:
- `CLAUDE` — Claude (web, API, Claude Code)
- `CHATGPT` — ChatGPT
- `GEMINI` — Google Gemini
- `CODEX` — OpenAI Codex CLI
- `CURSOR` — Cursor IDE
- `OPENCODE` — OpenCode
- `HERMES` — Hermes Agent
- `OTHER` — Any other platform

## Example

After a productive conversation about database optimization:

```bash
curl -X POST "$AIVAULT_API_URL/api/collector/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIVAULT_API_KEY" \
  -d '{
    "sessionId": "conv-2026-06-02-db-opt",
    "platform": "CLAUDE",
    "title": "Database Query Optimization Discussion",
    "messages": [
      {"role": "user", "content": "How can I optimize this slow query?"},
      {"role": "assistant", "content": "Let me analyze your query plan..."}
    ]
  }'
```

## Notes

- Duplicate detection is automatic — syncing the same `sessionId` twice will update, not duplicate
- Embeddings are generated automatically for semantic search
- Keep message content under 10,000 characters per message for best performance
