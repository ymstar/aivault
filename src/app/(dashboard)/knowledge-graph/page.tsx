'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';

const PLATFORM_COLORS: Record<string, string> = {
  CHATGPT: '#22c55e',
  CLAUDE: '#f97316',
  GEMINI: '#4285F4',
  CODEX: '#06b6d4',
  CURSOR: '#a855f7',
  OPENCODE: '#10b981',
  HERMES: '#ec4899',
  OTHER: '#a3a3a3',
};

const platformEmoji: Record<string, string> = {
  CHATGPT: '🤖', CLAUDE: '🧠', GEMINI: '✨', CODEX: '🔧',
  CURSOR: '🖱️', OPENCODE: '📖', HERMES: '🪽', OTHER: '💬',
};

interface GraphNode {
  id: string;
  title: string;
  platform: string;
  messageCount: number;
  x: number;
  y: number;
  cluster: number;
  summary: string | null;
}

interface ClusterInfo {
  id: number;
  label: string;
  count: number;
}

interface TooltipPayload {
  payload: GraphNode;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const node = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <span>{platformEmoji[node.platform] || '💬'}</span>
        <span className="font-medium text-sm text-zinc-200">{node.title}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{node.platform}</span>
        <span>·</span>
        <span>{node.messageCount} messages</span>
      </div>
      {node.summary && (
        <p className="mt-2 text-[11px] text-zinc-500 line-clamp-3">
          {node.summary.replace(/\*\*.*?\*\*/g, '').replace(/[\n#]/g, ' ').slice(0, 150)}
        </p>
      )}
    </div>
  );
}

export default function KnowledgeGraphPage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    fetch('/api/stats/knowledge-graph')
      .then((r) => r.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setClusters(data.clusters || []);
        setFallback(data.fallback || false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Graph</h1>
          <p className="text-zinc-400">
            Visualize connections between your conversations
            {fallback && (
              <span className="ml-2 text-yellow-500 text-xs">(embeddings not available — using fallback layout)</span>
            )}
          </p>
        </div>
      </div>

      {/* Legend */}
      {clusters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {clusters.map((c) => (
            <Badge
              key={c.id}
              variant="outline"
              className="border-zinc-700 text-zinc-400"
              style={{ borderColor: PLATFORM_COLORS[c.label] + '60', color: PLATFORM_COLORS[c.label] }}
            >
              {platformEmoji[c.label] || '💬'} {c.label} ({c.count})
            </Badge>
          ))}
        </div>
      )}

      {/* Graph */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4" />
            Conversation Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <Network className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No conversations to visualize</p>
              <p className="text-sm mt-1">Import some conversations first</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-220, 220]}
                  tick={false}
                  axisLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[-220, 220]}
                  tick={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#3f3f46' }} />
                <Scatter
                  data={nodes}
                  onClick={(data) => {
                    const node = data as unknown as GraphNode;
                    router.push(`/conversations/${node.id}`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {nodes.map((node) => (
                    <Cell
                      key={node.id}
                      fill={PLATFORM_COLORS[node.platform] || '#a3a3a3'}
                      fillOpacity={0.8}
                      r={Math.max(6, Math.min(20, 4 + Math.sqrt(node.messageCount)))}
                      stroke={PLATFORM_COLORS[node.platform] || '#a3a3a3'}
                      strokeWidth={1}
                      strokeOpacity={0.3}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {nodes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{nodes.length}</p>
              <p className="text-xs text-zinc-500">Conversations mapped</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{clusters.length}</p>
              <p className="text-xs text-zinc-500">Platform clusters</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {nodes.reduce((sum, n) => sum + n.messageCount, 0).toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">Total messages mapped</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
