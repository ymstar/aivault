'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot, Loader2, Trash2, RefreshCw, Wifi, WifiOff, Clock, Server,
  ExternalLink, Copy, Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const platformEmoji: Record<string, string> = {
  CHATGPT: '🤖', CLAUDE: '🧠', GEMINI: '✨', CODEX: '🔧',
  CURSOR: '🖱️', OPENCODE: '📖', HERMES: '🪽',
};

const platformColor: Record<string, string> = {
  CHATGPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLAUDE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  GEMINI: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CODEX: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  CURSOR: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OPENCODE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  HERMES: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

interface Agent {
  id: string;
  agentId: string;
  name: string;
  platform: string;
  metadata: Record<string, unknown>;
  online: boolean;
  lastSeen: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  // Auto-refresh every 30s to keep status accurate
  useEffect(() => {
    const interval = setInterval(fetchAgents, 30_000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const deleteAgent = async (id: string) => {
    if (!confirm('Remove this agent? It will need to re-register to sync again.')) return;
    setDeleting(id);
    try {
      await fetch(`/api/agents?id=${id}`, { method: 'DELETE' });
      setAgents((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const onlineCount = agents.filter((a) => a.online).length;
  const offlineCount = agents.length - onlineCount;

  const mcpSnippet = `{
  "mcpServers": {
    "aivault": {
      "command": "npx",
      "args": ["aivault-mcp-server"],
      "env": {
        "AIVAULT_URL": "<your-aivault-url>",
        "AIVAULT_API_KEY": "<your-api-key>"
      }
    }
  }
}`;

  const copySnippet = () => {
    navigator.clipboard.writeText(mcpSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-zinc-400">MCP-registered agent connections and their sync status</p>
        </div>
        <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchAgents}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Summary */}
      {agents.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{agents.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Total Agents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{onlineCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Online</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-zinc-500">{offlineCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Offline</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent List */}
      {agents.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/50">
                  <Bot className="h-8 w-8 text-zinc-600" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">No agents connected</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Connect your AI agents via MCP to auto-sync conversations to AIVault.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status indicator */}
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                        <span className="text-xl">{platformEmoji[agent.platform] || '🤖'}</span>
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                          agent.online ? 'bg-green-500' : 'bg-zinc-600'
                        }`}
                      />
                    </div>

                    {/* Agent info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        <Badge
                          variant="outline"
                          className={platformColor[agent.platform] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}
                        >
                          {agent.platform}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          {agent.online ? (
                            <Wifi className="h-3 w-3 text-green-500" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-zinc-600" />
                          )}
                          {agent.online ? (
                            <span className="text-green-400">Online</span>
                          ) : (
                            <span>Offline</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(agent.lastSeen)}
                        </span>
                        {agent.metadata && typeof agent.metadata === 'object' && Object.keys(agent.metadata).length > 0 && (
                          <span className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {Object.entries(agent.metadata)
                              .filter(([, v]) => v != null && v !== '')
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => deleteAgent(agent.id)}
                    disabled={deleting === agent.id}
                  >
                    {deleting === agent.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Setup Guide */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-5 w-5" /> Connect an Agent via MCP
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Add the AIVault MCP server to your agent&apos;s configuration to auto-sync conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 border border-zinc-800 p-4 text-xs text-zinc-300 font-mono leading-relaxed">
              {mcpSnippet}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300"
              onClick={copySnippet}
            >
              {copiedSnippet ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/aivault-org/aivault-mcp-server"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              aivault-mcp-server <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-500">
              Get your API key from Settings → API Keys
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
