'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2, MessageSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const platformColors: Record<string, string> = {
  CHATGPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLAUDE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

interface SearchResult {
  message_id: string;
  conversation_id: string;
  conversation_title: string;
  platform: string;
  message_content: string;
  message_role: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('aivault-recent-searches');
    if (saved) setRecentSearches(JSON.parse(saved));
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

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setResults([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setResults(data.results || []);
      // Save recent search
      const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('aivault-recent-searches', JSON.stringify(updated));
    } catch { setResults([]); }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const escapeHtml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const highlightMatch = (text: string, q: string) => {
    if (!q) return escapeHtml(text);
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
    return parts.map((part) =>
      testRegex.test(part) ? `<mark class="bg-indigo-500/30 text-indigo-200 rounded px-0.5">${part}</mark>` : part
    ).join('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Search your AI history</h1>
        <p className="text-zinc-400">Find any conversation across all your AI platforms</p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search conversations..."
          className="h-14 pl-12 pr-24 bg-zinc-900 border-zinc-700 text-lg"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <kbd className="hidden sm:inline-flex items-center rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            Ctrl+K
          </kbd>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700">
            Search
          </button>
        </div>
      </form>

      {/* Recent searches */}
      {!searched && recentSearches.length > 0 && (
        <div>
          <p className="text-sm text-zinc-500 mb-3">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); doSearch(s); }}
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
        <div className="flex flex-col items-center py-12 text-center">
          <Search className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-zinc-400">No results found for &quot;{query}&quot;</p>
          <p className="text-sm text-zinc-500">Try different keywords</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">{results.length} results</p>
          {results.map(r => (
            <Link key={r.message_id} href={`/conversations/${r.conversation_id}`}>
              <div className="rounded-lg border border-zinc-800 p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={platformColors[r.platform] || ''}>
                    {r.platform}
                  </Badge>
                  <span className="text-sm text-zinc-400">{r.conversation_title}</span>
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
        <div className="flex flex-col items-center py-12 text-center">
          <MessageSquare className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-zinc-400">Search through all your AI conversations</p>
          <p className="text-sm text-zinc-500">Try searching for a topic, keyword, or question</p>
        </div>
      )}
    </div>
  );
}
