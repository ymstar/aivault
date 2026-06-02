'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2, Sparkles, TextSearch } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface SearchResult {
  message_id: string;
  conversation_id: string;
  conversation_title: string;
  platform: string;
  message_content: string;
  message_role: string;
  similarity?: number | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<'keyword' | 'semantic'>('keyword');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aivault-recent-searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const doSearch = async (q: string, searchMode?: 'keyword' | 'semantic') => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    const activeMode = searchMode || mode;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&mode=${activeMode}`);
      if (!res.ok) {
        setResults([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setResults(data.results || []);
      try {
        localStorage.setItem('aivault-has-searched', '1');
      } catch { /* ignore */ }
      setRecentSearches((prev) => {
        const updated = [q, ...prev.filter((s) => s !== q)].slice(0, 5);
        try {
          localStorage.setItem('aivault-recent-searches', JSON.stringify(updated));
        } catch { /* ignore */ }
        return updated;
      });
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const escapeHtml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const highlightMatch = (text: string, q: string) => {
    if (!q) return escapeHtml(text.slice(0, 150) + (text.length > 150 ? '...' : ''));
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(text.slice(0, 150) + (text.length > 150 ? '...' : ''));
    const start = Math.max(0, idx - 50);
    const end = Math.min(text.length, idx + q.length + 100);
    const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
    const escaped = escapeHtml(snippet);
    const escapedQ = escapeHtml(q);
    const splitRegex = new RegExp(`(${escapedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const testRegex = new RegExp(`^${escapedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const parts = escaped.split(splitRegex);
    return parts
      .map((part) =>
        testRegex.test(part) ? `<mark class="bg-indigo-500/30 text-indigo-200 rounded px-0.5">${part}</mark>` : part
      )
      .join('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Search your AI history</h1>
        <p className="text-zinc-400">Find any conversation across all your AI platforms</p>
      </div>

      {/* Search mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
          <Button
            variant={mode === 'keyword' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('keyword')}
            className="gap-1.5 h-8 text-xs"
          >
            <TextSearch className="h-3.5 w-3.5" />
            Keyword
          </Button>
          <Button
            variant={mode === 'semantic' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('semantic')}
            className="gap-1.5 h-8 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Semantic
          </Button>
        </div>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'semantic' ? 'Describe what you\'re looking for...' : 'Search by keyword...'}
          className="h-14 pl-12 pr-24 bg-zinc-900 border-zinc-700 text-lg"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <kbd className="hidden sm:inline-flex items-center rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            Ctrl+K
          </kbd>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            Search
          </button>
        </div>
      </form>

      {/* Semantic mode hint */}
      {mode === 'semantic' && !searched && (
        <p className="text-center text-xs text-zinc-600">
          Semantic search uses AI embeddings to find conceptually related content, not just exact keyword matches.
        </p>
      )}

      {/* Recent searches */}
      {!searched && recentSearches.length > 0 && (
        <div>
          <p className="text-sm text-zinc-500 mb-3">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  doSearch(s);
                }}
                className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:border-indigo-500/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length === 0 && (
        <EmptyState
          icon={Search}
          title={`No results found for "${query}"`}
          description="Try different keywords or switch to semantic search"
        />
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            {results.length} results
            {mode === 'semantic' && <span className="ml-1 text-indigo-400">(semantic)</span>}
          </p>
          {results.map((r) => (
            <Link key={r.message_id} href={`/conversations/${r.conversation_id}`}>
              <div className="rounded-lg border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={platformColors[r.platform] || ''}>
                    {r.platform}
                  </Badge>
                  <span className="text-sm text-zinc-400">{r.conversation_title}</span>
                  {r.similarity != null && r.similarity > 0 && (
                    <span className="text-[11px] text-indigo-400 ml-auto">
                      {(r.similarity * 100).toFixed(0)}% match
                    </span>
                  )}
                </div>
                <p
                  className="text-sm text-zinc-300 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: highlightMatch(r.message_content, query) }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!searched && recentSearches.length === 0 && (
        <EmptyState
          icon={Search}
          title="Search through all your AI conversations"
          description="Try searching for a topic, keyword, or question"
        />
      )}
    </div>
  );
}
