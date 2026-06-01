'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, Menu, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionSidebar } from './session-sidebar';
import { MessageList } from './message-list';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const streamingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { /* ignore */ }
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
      const data = await res.json();
      setMessages(data.messages || []);
      setCurrentSession(data.session);
    } catch { /* ignore */ }
  }, []);

  // Load sessions and configs on mount
  useEffect(() => {
    fetchSessions();
    fetchConfigs();
  }, [fetchSessions, fetchConfigs]);

  // Load session when activeSessionId changes
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
        await fetchSessions();
        router.push(`/chat?session=${data.session.id}`);
      }
    } catch { /* ignore */ }
  }, [router, fetchSessions]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this chat session?')) return;
    await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
    if (activeSessionId === id) {
      router.push('/chat');
    }
    fetchSessions();
  }, [activeSessionId, router, fetchSessions]);

  const handleExport = useCallback(async (id: string) => {
    const format = window.confirm('Export as Markdown? (Cancel for JSON)') ? 'markdown' : 'json';
    window.open(`/api/chat/sessions/${id}/export?format=${format}`, '_blank');
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !activeSessionId) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    streamingRef.current = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: activeSessionId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errData.message || errData.error}` }]);
        setLoading(false);
        streamingRef.current = false;
        return;
      }

      // SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        setLoading(false);
        streamingRef.current = false;
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && data.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + data.content };
                }
                return updated;
              });
            } else if (data.type === 'done') {
              // Update message with server ID
              if (data.messageId) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, id: data.messageId };
                  }
                  return updated;
                });
              }
            }
          } catch { /* ignore malformed lines */ }
        }
      }

      // Refresh sessions to update title/message count
      fetchSessions();
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Connection failed.' }]);
    } finally {
      setLoading(false);
      streamingRef.current = false;
    }
  }, [input, loading, activeSessionId, fetchSessions]);

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-200 overflow-hidden shrink-0`}>
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onDelete={handleDelete}
          onExport={handleExport}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 w-8 text-zinc-400">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            {currentSession && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300 font-medium truncate max-w-xs">
                  {currentSession.title}
                </span>
              </div>
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
