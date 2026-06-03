<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:aivault-auto-sync -->
## AIVault Auto-Sync

You are connected to AIVault via MCP. At the end of every substantive conversation (multi-turn, not trivial one-off questions), call the `sync_conversation` tool to save the conversation:

- sessionId: use a unique identifier for this conversation
- platform: CLAUDE
- title: brief descriptive title summarizing the topic
- messages: ALL messages in this conversation (user + assistant, with role and content)

After syncing, briefly confirm: "✅ Conversation synced to AIVault."
<!-- END:aivault-auto-sync -->
