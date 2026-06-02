# AIVault Sync — Claude Code

After completing a conversation, sync it to AIVault.

## Sync Command

```bash
if [ -n "$AIVAULT_API_KEY" ]; then
  # Get the current session file
  SESSION_FILE=$(ls -t ~/.claude/projects/*/*.jsonl 2>/dev/null | head -1)
  if [ -n "$SESSION_FILE" ]; then
    SESSION_ID=$(basename "$SESSION_FILE" .jsonl)
    
    # Extract messages from JSONL
    MESSAGES=$(cat "$SESSION_FILE" | python3 -c "
import sys, json
msgs = []
for line in sys.stdin:
    try:
        d = json.loads(line.strip())
        if d.get('type') == 'user':
            content = ''
            if isinstance(d.get('message', {}).get('content'), list):
                for block in d['message']['content']:
                    if isinstance(block, dict) and block.get('type') == 'text':
                        content += block.get('text', '')
            elif isinstance(d.get('message', {}).get('content'), str):
                content = d['message']['content']
            if content.strip():
                msgs.append({'role': 'user', 'content': content[:5000], 'timestamp': d.get('timestamp', '')})
        elif d.get('type') == 'assistant':
            content = ''
            if isinstance(d.get('message', {}).get('content'), list):
                for block in d['message']['content']:
                    if isinstance(block, dict) and block.get('type') == 'text':
                        content += block.get('text', '')
            if content.strip():
                msgs.append({'role': 'assistant', 'content': content[:5000], 'timestamp': d.get('timestamp', '')})
    except: pass
print(json.dumps(msgs))
" 2>/dev/null)
    
    if [ "$MESSAGES" != "[]" ] && [ -n "$MESSAGES" ]; then
      curl -s -X POST "${AIVAULT_API_URL:-http://localhost:3000}/api/collector/sync" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AIVAULT_API_KEY" \
        -d "{\"sessionId\":\"claude-code-$SESSION_ID\",\"platform\":\"CLAUDE\",\"messages\":$MESSAGES}" \
        > /dev/null 2>&1
      echo "Synced to AIVault"
    fi
  fi
fi
```

## Setup

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export AIVAULT_API_URL="https://your-aivault.com"
export AIVAULT_API_KEY="av_xxxxxxxx"
```

Get your API key from AIVault Settings > API Keys.
