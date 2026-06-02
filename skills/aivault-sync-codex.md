# AIVault Sync — Codex CLI

After completing a conversation, sync it to AIVault.

## Sync Command

```bash
if [ -n "$AIVAULT_API_KEY" ]; then
  # Find the latest Codex session
  SESSION_FILE=$(find ~/.codex/sessions -name "*.jsonl" -type f 2>/dev/null | sort -r | head -1)
  if [ -n "$SESSION_FILE" ]; then
    SESSION_ID=$(basename "$SESSION_FILE" .jsonl | sed 's/rollout-//')
    
    # Extract messages from Codex JSONL
    MESSAGES=$(cat "$SESSION_FILE" | python3 -c "
import sys, json
msgs = []
for line in sys.stdin:
    try:
        d = json.loads(line.strip())
        if d.get('type') != 'response_item': continue
        payload = d.get('payload', {})
        if payload.get('type') != 'message': continue
        role = payload.get('role', '')
        if role not in ('user', 'assistant'): continue
        content_blocks = payload.get('content', [])
        text = ' '.join(b.get('text', '') for b in content_blocks if b.get('type') in ('input_text', 'output_text'))
        if text.strip():
            msgs.append({'role': role, 'content': text[:5000], 'timestamp': d.get('timestamp', '')})
    except: pass
print(json.dumps(msgs))
" 2>/dev/null)
    
    if [ "$MESSAGES" != "[]" ] && [ -n "$MESSAGES" ]; then
      curl -s -X POST "${AIVAULT_API_URL:-http://localhost:3000}/api/collector/sync" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AIVAULT_API_KEY" \
        -d "{\"sessionId\":\"codex-$SESSION_ID\",\"platform\":\"CODEX\",\"messages\":$MESSAGES}" \
        > /dev/null 2>&1
      echo "Synced to AIVault"
    fi
  fi
fi
```

## Setup

Add to your shell profile:
```bash
export AIVAULT_API_URL="https://your-aivault.com"
export AIVAULT_API_KEY="av_xxxxxxxx"
```
