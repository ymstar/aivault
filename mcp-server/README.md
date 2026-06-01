# AIVault MCP Server

An MCP (Model Context Protocol) server that exposes AIVault conversation data to any AI agent.

## Setup

```bash
cd mcp-server
npm install
```

Set environment variables:
- `SUPABASE_SERVICE_ROLE_KEY` (required) — your Supabase service role key
- `AIVAULT_USER_ID` (optional) — user ID to filter by; if omitted, the first user in the database is used

## Available Tools

| Tool | Description |
|------|-------------|
| `search_conversations` | Search by keyword in title or message content |
| `get_conversation` | Get full conversation with all messages |
| `list_conversations` | List recent conversations |
| `get_stats` | Get conversation/message/platform statistics |

## Configure in Hermes Agent

Add to `~/.hermes/hermes-agent/config.yaml`:

```yaml
mcp:
  servers:
    aivault:
      command: node
      args: ["/home/ubuntu/aivault/mcp-server/index.js"]
      env:
        SUPABASE_SERVICE_ROLE_KEY: "your-key-here"
        # AIVAULT_USER_ID: "optional-user-id"
```

## Configure in Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aivault": {
      "command": "node",
      "args": ["/home/ubuntu/aivault/mcp-server/index.js"],
      "env": {
        "SUPABASE_SERVICE_ROLE_KEY": "your-key-here"
      }
    }
  }
}
```

## Example Usage

```
# Search for conversations about "Python"
→ search_conversations({ query: "Python", platform: "chatgpt", limit: 5 })

# Get a specific conversation
→ get_conversation({ conversationId: "abc-123" })

# List recent Claude conversations
→ list_conversations({ platform: "claude", limit: 10 })

# View stats
→ get_stats()
```
