'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, User, Bot, Search, ChevronUp, ChevronDown, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';

const platformColors: Record<string, string> = {
  CHATGPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLAUDE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  GEMINI: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CODEX: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  CURSOR: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OPENCODE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  HERMES: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
  token_count?: number | null;
}

interface ConversationDetail {
  id: string;
  title: string;
  platform: string;
  created_at: string;
  tags: string[];
  summary: string | null;
  messages: Message[];
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}


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

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function TagEditor({
  tags,
  allTags,
  onChange,
}: {
  tags: string[];
  allTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!input.trim()) return allTags.filter((t) => !tags.includes(t)).slice(0, 8);
    const q = input.toLowerCase();
    return allTags.filter((t) => t.includes(q) && !tags.includes(t)).slice(0, 8);
  }, [input, allTags, tags]);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || tags.includes(normalized)) return;
    onChange([...tags, normalized]);
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${tagColor(tag)}`}
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-white transition-colors">
            ×
          </button>
        </span>
      ))}
      <div className="relative">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addTag(input); }
            if (e.key === 'Escape') { setShowSuggestions(false); }
          }}
          placeholder="+ Add tag"
          className="w-24 bg-transparent border-0 text-xs text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:text-zinc-200"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 top-full mt-1 z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg py-1">
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndices, setMatchIndices] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/conversations/${params.id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setConv(data);
      } catch {
        setConv(null);
      }
      setLoading(false);
    }
    if (params.id) load();
  }, [params.id]);

  // Fetch all tags for autocomplete
  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setAllTags((d.tags || []).map((t: { name: string }) => t.name)))
      .catch(() => {});
  }, []);

  // Compute match indices when search query or conversation changes
  useEffect(() => {
    if (!searchQuery.trim() || !conv) {
      setMatchIndices([]);
      setCurrentMatch(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const indices: number[] = [];
    conv.messages.forEach((msg, i) => {
      if (msg.content.toLowerCase().includes(q)) {
        indices.push(i);
      }
    });
    setMatchIndices(indices);
    setCurrentMatch(indices.length > 0 ? 1 : 0);
  }, [searchQuery, conv]);

  // Scroll to current match
  useEffect(() => {
    if (matchIndices.length === 0 || currentMatch === 0) return;
    const msgIndex = matchIndices[currentMatch - 1];
    const msg = conv?.messages[msgIndex];
    if (msg) {
      const el = messageRefs.current.get(msg.id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatch, matchIndices, conv]);

  const handleTagsChange = useCallback(async (newTags: string[]) => {
    if (!conv) return;
    setConv((prev) => prev ? { ...prev, tags: newTags } : prev);
    try {
      await fetch(`/api/conversations/${conv.id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
    } catch { /* ignore */ }
  }, [conv]);

  const handleGenerateSummary = useCallback(async () => {
    if (!conv) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}/summary`, { method: 'POST' });
      const data = await res.json();
      if (data.summary) {
        setConv((prev) => prev ? { ...prev, summary: data.summary } : prev);
      }
    } catch { /* ignore */ }
    setSummaryLoading(false);
  }, [conv]);

  // Keyboard shortcut: Cmd/Ctrl+F to open search, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  const goToNext = useCallback(() => {
    if (matchIndices.length === 0) return;
    setCurrentMatch((prev) => (prev >= matchIndices.length ? 1 : prev + 1));
  }, [matchIndices.length]);

  const goToPrev = useCallback(() => {
    if (matchIndices.length === 0) return;
    setCurrentMatch((prev) => (prev <= 1 ? matchIndices.length : prev - 1));
  }, [matchIndices.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-zinc-400">Conversation not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/conversations')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/conversations')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold">{conv.title}</h1>
          <Badge variant="outline" className={platformColors[conv.platform] || ''}>
            {conv.platform}
          </Badge>
        </div>
        <div className="mb-2">
          <TagEditor tags={conv.tags || []} allTags={allTags} onChange={handleTagsChange} />
        </div>
        {/* Summary */}
        {conv.summary ? (
          <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="prose prose-invert prose-sm max-w-none text-zinc-400"
              dangerouslySetInnerHTML={{ __html: conv.summary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-200">$1</strong>').replace(/\n/g, '<br/>') }}
            />
          </div>
        ) : (
          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="mb-3 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-indigo-400 transition-colors disabled:opacity-50"
          >
            {summaryLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {summaryLoading ? 'Generating summary...' : 'Generate AI Summary'}
          </button>
        )}
        <p className="text-sm text-zinc-500">
          {conv.messages?.length || 0} messages · {new Date(conv.created_at).toLocaleString()}
        </p>
      </div>

      {/* Search bar (Cmd+F) */}
      {searchOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2">
          <Search className="h-4 w-4 text-zinc-500 shrink-0" />
          <Input
            ref={searchInputRef}
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.shiftKey ? goToPrev() : goToNext();
              }
            }}
            className="border-0 bg-transparent focus-visible:ring-0 text-sm"
          />
          {searchQuery && (
            <span className="text-xs text-zinc-500 shrink-0">
              {matchIndices.length > 0 ? `${currentMatch}/${matchIndices.length}` : '0 results'}
            </span>
          )}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev} disabled={matchIndices.length === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext} disabled={matchIndices.length === 0}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Keyboard hint when search is closed */}
      {!searchOpen && (
        <button
          onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <Search className="h-3 w-3" />
          <span>Press <kbd className="px-1 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-500 font-mono text-[10px]">⌘F</kbd> to search</span>
        </button>
      )}

      {/* Messages */}
      <div className="space-y-4">
        {conv.messages?.map((msg) => {
          const isMatch = searchQuery.trim() && msg.content.toLowerCase().includes(searchQuery.toLowerCase());
          const matchPos = matchIndices.indexOf(conv.messages.indexOf(msg));
          const isCurrent = matchPos >= 0 && currentMatch === matchPos + 1;

          return (
            <div
              key={msg.id}
              ref={(el) => {
                if (el) messageRefs.current.set(msg.id, el);
                else messageRefs.current.delete(msg.id);
              }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${
                isCurrent ? 'ring-1 ring-yellow-500/50 rounded-2xl' : ''
              }`}
            >
              {msg.role !== 'user' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                  <Bot className="h-4 w-4 text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap">
                    {searchQuery.trim() ? highlightText(msg.content, searchQuery) : msg.content}
                  </p>
                )}

                {/* Message metadata */}
                <div className="mt-2 flex items-center gap-3 text-[11px] opacity-60">
                  <span title={new Date(msg.created_at).toLocaleString()}>
                    {relativeTime(msg.created_at)}
                  </span>
                  {msg.token_count != null && msg.token_count > 0 && (
                    <span>{msg.token_count.toLocaleString()} tokens</span>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700">
                  <User className="h-4 w-4 text-zinc-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
