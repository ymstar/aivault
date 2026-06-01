'use client';

import { useEffect, useRef } from 'react';
import { MarkdownRenderer } from './markdown-renderer';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function MessageList({ messages, loading }: { messages: Message[]; loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
          <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <span className="text-2xl">AI</span>
          </div>
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="text-sm mt-1">Type a message below to begin</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-200'
            }`}
          >
            {msg.role === 'assistant' ? (
              <MarkdownRenderer content={msg.content} />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-zinc-800 rounded-2xl px-4 py-3">
            <span className="inline-flex items-center gap-1">
              <span className="animate-pulse text-zinc-400">●</span>
              <span className="animate-pulse delay-150 text-zinc-400">●</span>
              <span className="animate-pulse delay-300 text-zinc-400">●</span>
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
