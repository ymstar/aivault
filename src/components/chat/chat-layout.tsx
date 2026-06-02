'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, Download, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageList, type RAGSource } from './message-list';
import { MessageInput } from './message-input';
import { LLMConfigDialog } from './llm-config-dialog';

interface Session {
  id: string;
  title: string;
  provider_id: string | null;
  rag_enabled: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: RAGSource[];
}

export function ChatLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get('session');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
      return data.sessions || [];
    } catch { return []; }
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/configs');
      const data = await res.json();
      setHasConfig((data.configs || []).length > 0);
    } catch { /* ignore */ }
  }, []);

  const fetchSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${id}`);
      if (!res.ok) {
        setMessages([]);
        setCurrentSession(null);
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);
      setCurrentSession(data.session);
    } catch {
      setMessages([]);
      setCurrentSession(null);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchConfigs();
  }, [fetchSessions, fetchConfigs]);

  useEffect(() => {
    if (activeSessionId) {
      fetchSession(activeSessionId);
    } else {
      setMessages([]);
      setCurrentSession(null);
    }
  }, [activeSessionId, fetchSession]);

  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.session) {
        const updatedSessions = await fetchSessions();
        // Navigate to the new session
        router.push(`/chat?session=${data.session.id}`);
        return;
      }
    } catch { /* ignore */ }
  }, [router, fetchSessions]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this chat session?')) return;
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert('Failed to delete session');
        return;
      }
    } catch {
      alert('Failed to delete session');
      return;
    }

    // If deleting the active session, clear state and navigate to /chat
    if (activeSessionId === id) {
      setMessages([]);
      setCurrentSession(null);
      router.push('/chat');
    }

    // Refresh sessions list
    await fetchSessions();
  }, [activeSessionId, router, fetchSessions]);

  const handleExport = useCallback(async (id: string) => {
    const format = window.confirm('Export as Markdown? (Cancel for JSON)') ? 'markdown' : 'json';
    const win = window.open(`/api/chat/sessions/${id}/export?format=${format}`, '_blank');
    if (!win) alert('Popup blocked. Please allow popups for this site.');
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !activeSessionId) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: activeSessionId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${errData.message || errData.error}` },
        ]);
        return;
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: 'assistant',
          content: data.content,
          sources: data.sources,
        },
      ]);

      fetchSessions();

      try {
        localStorage.setItem('aivault-has-chatted', '1');
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: Connection failed.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeSessionId, fetchSessions]);

  return (
    <div className="flex h-full gap-4">
      {/* Session list sidebar */}
      <div className="w-64 shrink-0 flex flex-col border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
        <div className="p-3 border-b border-zinc-800">
          <Button onClick={handleNewChat} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeSessionId === session.id
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              onClick={() => router.push(`/chat?session=${session.id}`)}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="text-sm truncate flex-1">{session.title}</span>
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleExport(session.id); }}
                  className="p-1 rounded hover:bg-zinc-700"
                  title="Export"
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                  className="p-1 rounded hover:bg-red-700/50 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {currentSession && (
              <span className="text-sm text-zinc-300 font-medium truncate max-w-xs">
                {currentSession.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeSessionId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport(activeSessionId)}
                className="text-zinc-400 hover:text-white h-8"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConfig(true)}
              className="h-8 w-8 text-zinc-400 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages or empty state */}
        {!activeSessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
              <span className="text-2xl font-bold text-white">AI</span>
            </div>
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">AIVault Chat</h2>
            <p className="text-sm text-zinc-500 mb-6">Start a new conversation or select an existing one</p>
            <Button onClick={handleNewChat} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              New Chat
            </Button>
          </div>
        ) : (
          <MessageList messages={messages} loading={loading} />
        )}

        {/* Input */}
        {activeSessionId && (
          <MessageInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            loading={loading}
            hasConfig={hasConfig}
            onOpenSettings={() => setShowConfig(true)}
          />
        )}
      </div>

      {/* Config dialog */}
      <LLMConfigDialog
        open={showConfig}
        onClose={() => setShowConfig(false)}
        onConfigChange={() => { fetchConfigs(); fetchSessions(); }}
      />
    </div>
  );
}
