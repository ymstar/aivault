#!/bin/bash
# AIVault Universal Sync Script
# Usage: aivault-sync.sh <platform> <session-json-file|-> [title]
#
# Examples:
#   aivault-sync.sh CLAUDE ~/.claude/projects/*/session.jsonl "My Chat"
#   echo '{"messages":[...]}' | aivault-sync.sh CODEX - "My Session"

set -e

AIVAULT_URL="${AIVAULT_API_URL:-http://localhost:3000}"
AIVAULT_KEY="${AIVAULT_API_KEY}"

if [ -z "$AIVAULT_KEY" ]; then
  echo "Error: AIVAULT_API_KEY not set"
  echo "Get your key from AIVault Settings > API Keys"
  exit 1
fi

PLATFORM="${1:?Usage: aivault-sync.sh <platform> <file|-> [title]}"
INPUT="${2:?Usage: aivault-sync.sh <platform> <file|-> [title]}"
TITLE="${3:-}"
SESSION_ID="${4:-$(date +%s)-$$}"

# Generate session ID from file if not provided
if [ "$INPUT" != "-" ]; then
  SESSION_ID=$(basename "$INPUT" | sed 's/\.[^.]*$//')
fi

# Read messages - either from file or stdin
if [ "$INPUT" = "-" ]; then
  MESSAGES=$(cat)
else
  MESSAGES=$(cat "$INPUT")
fi

# If input is JSONL, convert to JSON array
if echo "$MESSAGES" | head -1 | grep -q '^{.*}$'; then
  # Looks like JSONL, convert
  MESSAGES=$(echo "$MESSAGES" | python3 -c "
import sys, json
msgs = []
for line in sys.stdin:
    try:
        d = json.loads(line.strip())
        if 'role' in d and 'content' in d:
            msgs.append(d)
    except: pass
print(json.dumps(msgs))
" 2>/dev/null)
fi

# Build request body
BODY=$(python3 -c "
import json, sys
msgs = json.loads(sys.stdin.read())
platform = sys.argv[1]
session_id = sys.argv[2]
title = sys.argv[3] or None

body = {
    'sessionId': session_id,
    'platform': platform,
    'messages': msgs
}
if title:
    body['title'] = title
print(json.dumps(body))
" "$PLATFORM" "$SESSION_ID" "$TITLE" <<< "$MESSAGES")

# Send to AIVault
RESPONSE=$(curl -s -X POST "$AIVAULT_URL/api/collector/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIVAULT_KEY" \
  -d "$BODY")

echo "$RESPONSE"
