'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Search, LayoutGrid, List, Upload, Loader2, Trash2,
  Tag as TagIcon, ChevronDown, CheckSquare, Square, X, Check, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

const platformColors: Record<string, string> = {
  CHATGPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLAUDE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  GEMINI: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CODEX: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  CURSOR: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OPENCODE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  HERMES: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

const platformEmoji: Record<string, string> = {
  CHATGPT: '🤖', CLAUDE: '🧠', GEMINI: '✨', CODEX: '🔧',
  CURSOR: '🖱️', OPENCODE: '📖', HERMES: '🪽',
};

const TAG_COLORS = [
  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'bg-green-500/15 text-green-400 border-green-500/20',
  'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'bg-red-500/15 text-red-400 border-red-500/20',
  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
];

function tagColorClass(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface Conversation {
  id: string;
  title: string;
  platform: string;
  message_count: number;
  created_at: string;
  tags?: string[];
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [platform, setPlatform] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Array<{ name: string; count: number }>>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // Batch mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);
        setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      }
    } catch { /* ignore */ }
  }, []);

  // Reset on filter change
  useEffect(() => {
    setConversations([]);
    setPage(1);
    setTotalPages(1);
    setTotal(0);
    setSelected(new Set());
  }, [debouncedSearch, platform, tagFilter]);

  // Fetch a page
  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (platform) params.set('platform', platform);
    if (tagFilter.length > 0) params.set('tags', tagFilter.join(','));
    params.set('page', String(pageNum));
    params.set('limit', '20');

    try {
      const res = await fetch(`/api/conversations?${params}`);
      if (!res.ok) {
        if (!append) setConversations([]);
        return;
      }
      const data = await res.json();
      const items: Conversation[] = data.items || [];
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (append) setConversations((prev) => [...prev, ...items]);
      else setConversations(items);
    } catch {
      if (!append) setConversations([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, platform, tagFilter]);

  useEffect(() => { fetchPage(1, false); }, [fetchPage]);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingMore && page < totalPages) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPage(nextPage, true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore, fetchPage]);

  // Fetch tags
  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags || []))
      .catch(() => {});
  }, []);

  // ─── Batch operations ───────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(conversations.map((c) => c.id)));
  }, [conversations]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} conversation${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => fetch(`/api/conversations/${id}`, { method: 'DELETE' })));
      setConversations((prev) => prev.filter((c) => !selected.has(c.id)));
      setTotal((prev) => prev - ids.length);
      setSelected(new Set());
      setSelectMode(false);
    } catch { /* ignore */ }
  }, [selected]);

  const handleBatchTag = useCallback(async () => {
    const tag = batchTagInput.trim().toLowerCase();
    if (!tag || selected.size === 0) return;

    const ids = [...selected];
    try {
      await Promise.all(
        ids.map(async (id) => {
          const conv = conversations.find((c) => c.id === id);
          const existingTags = conv?.tags || [];
          const newTags = [...new Set([...existingTags, tag])];
          await fetch(`/api/conversations/${id}/tags`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: newTags }),
          });
        })
      );
      setConversations((prev) =>
        prev.map((c) => {
          if (!selected.has(c.id)) return c;
          return { ...c, tags: [...new Set([...(c.tags || []), tag])] };
        })
      );
      setShowBatchTag(false);
      setBatchTagInput('');
    } catch { /* ignore */ }
  }, [batchTagInput, selected, conversations]);

  const handleExport = useCallback((format: string, ids?: string[]) => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (ids && ids.length > 0) params.set('ids', ids.join(','));
    window.open(`/api/conversations/export?${params}`, '_blank');
    setShowExportMenu(false);
  }, []);

  const platforms = ['', 'CHATGPT', 'CLAUDE', 'GEMINI', 'CODEX', 'CURSOR', 'OPENCODE', 'HERMES'];

  const selectedTagsSuggestions = useMemo(() => {
    if (!batchTagInput.trim()) return allTags.slice(0, 8);
    const q = batchTagInput.toLowerCase();
    return allTags.filter((t) => t.name.includes(q)).slice(0, 8);
  }, [batchTagInput, allTags]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-zinc-400">
            {total > 0 ? `${total} conversation${total !== 1 ? 's' : ''}` : 'No conversations'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <>
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => setShowExportMenu(!showExportMenu)} className="gap-1.5">
                  <Download className="h-4 w-4" /> Export
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg py-1">
                    {['json', 'markdown', 'csv'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleExport(fmt)}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 capitalize"
                      >
                        {fmt === 'markdown' ? 'Markdown' : fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)} className="gap-1.5">
                <CheckSquare className="h-4 w-4" /> Select
              </Button>
              <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}>
                <List className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Batch action bar */}
      {selectMode && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3">
          <span className="text-sm text-indigo-400 font-medium">{selected.size} selected</span>
          <div className="h-4 w-px bg-zinc-700" />
          <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
            Select all {total > conversations.length ? `(loaded ${conversations.length})` : ''}
          </Button>
          <div className="flex-1" />
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBatchTag(!showBatchTag)}
              disabled={selected.size === 0}
              className="gap-1 h-7"
            >
              <TagIcon className="h-3.5 w-3.5" /> Tag
            </Button>
            {showBatchTag && (
              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg p-2">
                <Input
                  placeholder="Tag name..."
                  value={batchTagInput}
                  onChange={(e) => setBatchTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBatchTag(); }}
                  className="h-7 text-xs mb-2"
                />
                {selectedTagsSuggestions.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5 mb-2">
                    {selectedTagsSuggestions.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setBatchTagInput(t.name)}
                        className="w-full text-left px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={handleBatchTag}
                  disabled={!batchTagInput.trim()}
                  className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  Apply tag
                </Button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchDelete}
            disabled={selected.size === 0}
            className="gap-1 h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={selected.size === 0}
              className="gap-1 h-7"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            {showExportMenu && selected.size > 0 && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg py-1">
                {['json', 'markdown', 'csv'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt, [...selected])}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 capitalize"
                  >
                    {fmt === 'markdown' ? 'Markdown' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>
        <div className="flex gap-1 items-center">
          {/* Tag filter dropdown */}
          {allTags.length > 0 && (
            <div className="relative">
              <Button
                variant={tagFilter.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="gap-1"
              >
                <TagIcon className="h-3.5 w-3.5" />
                {tagFilter.length > 0 ? `${tagFilter.length} tag${tagFilter.length > 1 ? 's' : ''}` : 'Tags'}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showTagDropdown && (
                <div className="absolute left-0 top-full mt-1 z-20 w-48 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg py-1 max-h-60 overflow-y-auto">
                  {allTags.map((t) => {
                    const active = tagFilter.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        onClick={() => {
                          setTagFilter((prev) =>
                            active ? prev.filter((x) => x !== t.name) : [...prev, t.name]
                          );
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${
                          active ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="text-zinc-600">{t.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {platforms.map((p) => (
            <Button
              key={p}
              variant={platform === p ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPlatform(p)}
            >
              {p ? (platformEmoji[p] + ' ' + p) : 'All'}
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
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Import your first AI conversation to get started"
          action={{ label: 'Import Now', href: '/import', icon: Upload }}
        />
      )}

      {/* Grid view */}
      {!loading && view === 'grid' && conversations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/conversations/${conv.id}`}>
              <Card
                className={`border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/30 hover:shadow-lg transition-all cursor-pointer h-full ${
                  selected.has(conv.id) ? 'ring-1 ring-indigo-500/50' : ''
                }`}
                onClick={(e) => {
                  if (selectMode) { e.preventDefault(); toggleSelect(conv.id); }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {selectMode && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selected.has(conv.id) ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
                        }`}>
                          {selected.has(conv.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                      )}
                      <span className="text-xl">{platformEmoji[conv.platform] || '💬'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={platformColors[conv.platform] || ''}>
                        {conv.platform}
                      </Badge>
                      {!selectMode && (
                        <button
                          onClick={(e) => handleDelete(e, conv.id)}
                          className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="font-medium line-clamp-2 mb-2">{conv.title}</h3>
                  {(conv.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {conv.tags!.slice(0, 3).map((tag) => (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] border ${tagColorClass(tag)}`}>
                          {tag}
                        </span>
                      ))}
                      {conv.tags!.length > 3 && (
                        <span className="text-[10px] text-zinc-500">+{conv.tags!.length - 3}</span>
                      )}
                    </div>
                  )}
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
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/conversations/${conv.id}`}>
              <div
                className={`flex items-center justify-between rounded-lg border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer ${
                  selected.has(conv.id) ? 'ring-1 ring-indigo-500/50 bg-indigo-500/5' : ''
                }`}
                onClick={(e) => {
                  if (selectMode) { e.preventDefault(); toggleSelect(conv.id); }
                }}
              >
                <div className="flex items-center gap-4">
                  {selectMode && (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selected.has(conv.id) ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
                    }`}>
                      {selected.has(conv.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                  )}
                  <span className="text-xl">{platformEmoji[conv.platform] || '💬'}</span>
                  <div>
                    <p className="font-medium">{conv.title}</p>
                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className={platformColors[conv.platform] || ''}>
                        {conv.platform}
                      </Badge>
                      <span className="text-xs text-zinc-500">{conv.message_count} messages</span>
                      {(conv.tags || []).slice(0, 2).map((tag) => (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] border ${tagColorClass(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">{new Date(conv.created_at).toLocaleDateString()}</span>
                  {!selectMode && (
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {!loading && conversations.length > 0 && (
        <div ref={sentinelRef} className="flex flex-col items-center py-4">
          {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />}
          {!loadingMore && page >= totalPages && (
            <p className="text-sm text-zinc-500">
              Loaded all {total} conversation{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
