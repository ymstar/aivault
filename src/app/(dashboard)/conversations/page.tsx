'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare, Search, LayoutGrid, List, Upload, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const platformColors: Record<string, string> = {
  CHATGPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLAUDE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  GEMINI: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const platformEmoji: Record<string, string> = {
  CHATGPT: '🤖', CLAUDE: '🧠', GEMINI: '✨',
};

interface Conversation {
  id: string;
  title: string;
  platform: string;
  message_count: number;
  created_at: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);
  const [platform, setPlatform] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
      }
    } catch { /* ignore */ }
  }, []);

  const fetchConversations = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (platform) params.set('platform', platform);
    params.set('limit', '50');
    try {
      const res = await fetch(`/api/conversations?${params}`, signal ? { signal } : undefined);
      if (!res.ok) {
        setConversations([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setConversations(data.items || []);
    } catch { setConversations([]); }
    setLoading(false);
  }, [debouncedSearch, platform]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const platforms = ['', 'CHATGPT', 'CLAUDE', 'GEMINI'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-zinc-400">{conversations.length} conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>
        <div className="flex gap-1">
          {platforms.map(p => (
            <Button
              key={p}
              variant={platform === p ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPlatform(p)}
            >
              {p ? platformEmoji[p] + ' ' + p : 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Empty state */}
      {!loading && conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="mb-4 h-16 w-16 text-zinc-700" />
          <h3 className="text-lg font-medium">No conversations yet</h3>
          <p className="mt-2 text-sm text-zinc-500">Import your first AI conversation to get started</p>
          <Link href="/import">
            <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">
              <Upload className="mr-2 h-4 w-4" /> Import Now
            </Button>
          </Link>
        </div>
      )}

      {/* Grid view */}
      {!loading && view === 'grid' && conversations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map(conv => (
            <Link key={conv.id} href={`/conversations/${conv.id}`}>
              <Card className="border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/30 hover:shadow-lg transition-all cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xl">{platformEmoji[conv.platform] || '💬'}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={platformColors[conv.platform] || ''}>
                        {conv.platform}
                      </Badge>
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium line-clamp-2 mb-2">{conv.title}</h3>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{conv.message_count} messages</span>
                    <span>{new Date(conv.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && conversations.length > 0 && (
        <div className="space-y-2">
          {conversations.map(conv => (
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">{new Date(conv.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
