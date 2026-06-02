'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, BookOpen } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';

export interface RAGSource {
  conversation_id: string;
  conversation_title: string;
  message_id: string;
  similarity: number;
  snippet: string;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: RAGSource[];
}

function SourcePanel({ sources }: { sources: RAGSource[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-zinc-700 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>📚 Referenced {sources.length} source{sources.length !== 1 ? 's' : ''}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <Link
              key={src.conversation_id + i}
              href={`/conversations/${src.conversation_id}`}
              className="block rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-indigo-400 truncate">
                  {src.conversation_title}
                </span>
                {src.similarity > 0 && (
                  <span className="text-[11px] text-zinc-600 shrink-0 ml-2">
                    {(src.similarity * 100).toFixed(0)}% match
                  </span>
                )}
              </div>
              {src.snippet && (
                <p className="text-[11px] text-zinc-500 line-clamp-2">{src.snippet}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
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
              <>
                <MarkdownRenderer content={msg.content} />
                {msg.sources && msg.sources.length > 0 && (
                  <SourcePanel sources={msg.sources} />
                )}
              </>
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
