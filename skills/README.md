# AIVault Agent Sync Skills

让 AI Agent 自动同步对话到 AIVault。

## 快速开始

### 1. 获取 API Key

在 AIVault Settings > API Keys 中生成一个 key（以 `av_` 开头）。

### 2. 配置环境变量

```bash
export AIVAULT_API_URL="https://your-aivault.com"
export AIVAULT_API_KEY="av_xxxxxxxx"
```

### 3. 选择同步方式

#### 方式 A：Agent 自动同步（推荐）

将对应的 skill 文件内容添加到 Agent 的配置中：

| Agent | 配置文件位置 | Skill 文件 |
|-------|-------------|-----------|
| Claude Code | `~/.claude/CLAUDE.md` 或项目 `AGENTS.md` | `aivault-sync-claude-code.md` |
| Codex CLI | `~/.codex/AGENTS.md` 或项目 `AGENTS.md` | `aivault-sync-codex.md` |
| 其他 Agent | Agent 的指令/技能配置文件 | `aivault-sync.md` |

Agent 会在对话结束时自动调用同步命令。

#### 方式 B：手动同步脚本

```bash
# 安装脚本
cp skills/aivault-sync.sh /usr/local/bin/aivault-sync
chmod +x /usr/local/bin/aivault-sync

# 使用
aivault-sync CLAUDE ~/.claude/projects/*/session.jsonl "My Chat"
```

## 支持的平台

| 平台标识 | 说明 |
|---------|------|
| `CLAUDE` | Claude Web / API / Claude Code |
| `CHATGPT` | ChatGPT |
| `GEMINI` | Google Gemini |
| `CODEX` | OpenAI Codex CLI |
| `CURSOR` | Cursor IDE |
| `OPENCODE` | OpenCode |
| `HERMES` | Hermes Agent |

## 工作原理

1. Agent 对话结束后，读取 skill 指令
2. Agent 调用 `curl` 将对话发送到 `/api/collector/sync`
3. AIVault 存储对话并自动生成 embeddings
4. 对话出现在 AIVault 的 Conversations 和 Knowledge Graph 中

## 去重

相同 `sessionId` 的对话会自动更新，不会重复存储。
