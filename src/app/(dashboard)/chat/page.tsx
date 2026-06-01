'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, ChevronDown, Settings, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  platform: string;
}

interface ChatConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_CONFIG: ChatConfig = {
  apiKey: '',
  baseUrl: 'https://token-plan-cn.xiaomimimo.com/anthropic',
  model: 'mimo-v2-pro',
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string>('');
  const [showConvPicker, setShowConvPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [configDraft, setConfigDraft] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [showKey, setShowKey] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aivault-chat-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const loaded = { ...DEFAULT_CONFIG, ...parsed };
        setConfig(loaded);
        setConfigDraft(loaded);
      } catch {}
    }
  }, []);

  useEffect(() => {
    fetch('/api/conversations?limit=50')
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const saveConfig = useCallback(() => {
    setConfig(configDraft);
    localStorage.setItem('aivault-chat-config', JSON.stringify(configDraft));
    setShowSettings(false);
  }, [configDraft]);

  /** Parse an error response from the API, returning a user-friendly string */
  const parseErrorResponse = async (res: Response): Promise<string> => {
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return json.message || json.error || text;
      } catch {
        return text;
      }
    } catch {
      return 'Unknown error';
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: selectedConv || undefined,
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl || undefined,
          model: config.model || undefined,
        }),
      });

      if (!res.ok) {
        const errText = await parseErrorResponse(res);

        // If the error is about missing API key, prompt user to configure
        if (res.status === 400 && errText.includes('API Key')) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: '⚠️ No API Key configured. Please click the ⚙️ Settings button to add your API Key.' },
          ]);
          setShowSettings(true);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errText}` }]);
        }
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Failed to read response stream.' }]);
        setLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      let hasContent = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) hasContent = true;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        }
        // Flush any remaining buffered bytes in the decoder
        const tail = decoder.decode();
        if (tail) {
          hasContent = true;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + tail };
            }
            return updated;
          });
        }
      } catch (streamErr) {
        console.error('Stream read error:', streamErr);
        if (!hasContent) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant' && !last.content) {
              updated[updated.length - 1] = { ...last, content: 'Error: Connection interrupted.' };
            }
            return updated;
          });
        }
      }

      // If stream ended with no content at all, show a fallback message
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: 'No response received. Please try again.' };
        }
        return updated;
      });
    } catch (err) {
      console.error('Send message error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Connection failed. Please check your network and try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, selectedConv, config]);

  const selectedTitle = conversations.find((c) => c.id === selectedConv)?.title;
  const hasApiKey = !!config.apiKey;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Context:</span>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              onClick={() => setShowConvPicker(!showConvPicker)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {selectedTitle || 'All conversations'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
            {showConvPicker && (
              <div className="absolute top-full left-0 mt-1 w-72 max-h-60 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-50">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                  onClick={() => { setSelectedConv(''); setShowConvPicker(false); }}
                >
                  All conversations
                </button>
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 truncate"
                    onClick={() => { setSelectedConv(c.id); setShowConvPicker(false); }}
                  >
                    {c.title || 'Untitled'}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedConv && (
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-300"
              onClick={() => setSelectedConv('')}
            >
              Clear
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setConfigDraft(config); setShowSettings(true); setShowKey(false); }}
          className={`text-zinc-400 hover:text-white ${!hasApiKey ? 'animate-pulse text-amber-400 hover:text-amber-300' : ''}`}
        >
          <Settings className="h-4 w-4 mr-1" />
          {!hasApiKey && <span className="text-xs">Setup</span>}
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden border-zinc-800 bg-zinc-900/50">
        <CardContent className="h-full p-0">
          <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">Ask anything about your conversations</p>
                <p className="text-sm mt-1">Select a specific conversation as context, or search across all</p>
                {!hasApiKey && (
                  <button
                    onClick={() => { setConfigDraft(config); setShowSettings(true); setShowKey(false); }}
                    className="mt-4 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/20 transition-colors"
                  >
                    ⚙️ Configure API Key to start chatting
                  </button>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  {msg.content || (msg.role === 'assistant' && loading ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse delay-150">●</span>
                      <span className="animate-pulse delay-300">●</span>
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={hasApiKey ? 'Ask about your conversations...' : 'Type a message (configure API Key in ⚙️ settings if needed)'}
          className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-indigo-500"
          disabled={loading}
        />
        <Button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Chat Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={configDraft.apiKey}
                    onChange={(e) => setConfigDraft({ ...configDraft, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={configDraft.baseUrl}
                  onChange={(e) => setConfigDraft({ ...configDraft, baseUrl: e.target.value })}
                  placeholder="https://token-plan-cn.xiaomimimo.com/anthropic"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                />
                <p className="text-xs text-zinc-500 mt-1">OpenAI / Anthropic 兼容的 API 地址</p>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Model</label>
                <input
                  type="text"
                  value={configDraft.model}
                  onChange={(e) => setConfigDraft({ ...configDraft, model: e.target.value })}
                  placeholder="mimo-v2-pro"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowSettings(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button onClick={saveConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
