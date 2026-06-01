'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, ChevronDown } from 'lucide-react';
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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string>('');
  const [showConvPicker, setShowConvPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/conversations?limit=50')
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

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
        body: JSON.stringify({ message: text, conversationId: selectedConv || undefined }),
      });

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Failed to get response.' }]);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Connection failed.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, selectedConv]);

  const selectedTitle = conversations.find((c) => c.id === selectedConv)?.title;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-4xl mx-auto">
      {/* Context selector */}
      <div className="mb-4 flex items-center gap-2">
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

      {/* Messages */}
      <Card className="flex-1 overflow-hidden border-zinc-800 bg-zinc-900/50">
        <CardContent className="h-full p-0">
          <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">Ask anything about your conversations</p>
                <p className="text-sm mt-1">Select a specific conversation as context, or search across all</p>
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
          placeholder="Ask about your conversations..."
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
    </div>
  );
}
