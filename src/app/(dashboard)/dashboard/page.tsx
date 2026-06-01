'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, MessageCircle, Link2, Crown, Upload, Loader2, CheckCircle2, Search, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';

const platformEmoji: Record<string, string> = {
  CHATGPT: '🤖', CLAUDE: '🧠', GEMINI: '✨',
};

const platformColors: Record<string, string> = {
  CHATGPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLAUDE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  GEMINI: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

interface Stats {
  totalConversations: number;
  totalMessages: number;
  platforms: string[];
  plan: string;
}

interface Conversation {
  id: string;
  title: string;
  platform: string;
  message_count: number;
  created_at: string;
}

function OnboardingChecklist({
  hasImported,
  hasSearched,
  hasChatted,
}: {
  hasImported: boolean;
  hasSearched: boolean;
  hasChatted: boolean;
}) {
  const steps = [
    {
      done: hasImported,
      icon: Upload,
      label: 'Import your first conversation',
      description: 'Bring in data from ChatGPT, Claude, or Gemini',
      href: '/import',
    },
    {
      done: hasSearched,
      icon: Search,
      label: 'Search your conversations',
      description: 'Find anything across all your AI chats',
      href: '/search',
    },
    {
      done: hasChatted,
      icon: Sparkles,
      label: 'Chat with your AI data',
      description: 'Ask questions about your conversation history',
      href: '/chat',
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Get started with AIVault</p>
        <span className="text-xs text-zinc-500">{completed} of {steps.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <Link key={step.href} href={step.href}>
            <div className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
              step.done
                ? 'border-zinc-800/50 bg-zinc-900/30'
                : 'border-zinc-800 hover:bg-zinc-800/50 cursor-pointer'
            }`}>
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <step.icon className="h-5 w-5 shrink-0 text-zinc-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-zinc-500 line-through' : ''}`}>
                  {step.label}
                </p>
                <p className="text-xs text-zinc-600">{step.description}</p>
              </div>
              {!step.done && (
                <Button size="sm" variant="ghost" className="shrink-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">
                  Go
                </Button>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasChatted, setHasChatted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, convsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/conversations?limit=5'),
        ]);
        if (!statsRes.ok || !convsRes.ok) {
          setLoading(false);
          return;
        }
        const statsData = await statsRes.json();
        const convsData = await convsRes.json();
        setStats(statsData);
        setRecent(convsData.items || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    setHasSearched(localStorage.getItem('aivault-has-searched') === '1');
    setHasChatted(localStorage.getItem('aivault-has-chatted') === '1');
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Conversations', value: stats?.totalConversations || 0, icon: MessageSquare },
    { label: 'Total Messages', value: stats?.totalMessages || 0, icon: MessageCircle },
    { label: 'Platforms Connected', value: stats?.platforms?.length || 0, icon: Link2 },
    { label: 'Plan', value: stats?.plan || 'FREE', icon: Crown },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting} 👋</h1>
          <p className="text-zinc-400">Here&apos;s your AIVault overview.</p>
        </div>
        <Link href="/import">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Upload className="mr-2 h-4 w-4" /> Quick Import
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-zinc-400">{stat.label}</CardDescription>
              <stat.icon className="h-5 w-5 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Conversations */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <OnboardingChecklist
              hasImported={(stats?.totalConversations ?? 0) > 0}
              hasSearched={hasSearched}
              hasChatted={hasChatted}
            />
          ) : (
            <div className="space-y-3">
              {recent.map((conv) => (
                <Link key={conv.id} href={`/conversations/${conv.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <span className="text-xl">{platformEmoji[conv.platform] || '💬'}</span>
                      <div>
                        <p className="font-medium">{conv.title}</p>
                        <div className="mt-1 flex items-center gap-3">
                          <Badge variant="outline" className={platformColors[conv.platform] || ''}>
                            {conv.platform}
                          </Badge>
                          <span className="text-xs text-zinc-500">{conv.message_count} messages</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-zinc-500">{new Date(conv.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
