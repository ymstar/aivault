'use client';

import { useRef, useCallback } from 'react';
import { Send, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  hasConfig: boolean;
  onOpenSettings: () => void;
}

export function MessageInput({ value, onChange, onSend, loading, hasConfig, onOpenSettings }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!loading && value.trim()) onSend();
      }
    },
    [loading, value, onSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  if (!hasConfig) {
    return (
      <div className="border-t border-zinc-800 p-4">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configure an LLM provider to start chatting
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-800 p-4">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-[200px]"
          disabled={loading}
        />
        <Button
          onClick={onSend}
          disabled={loading || !value.trim()}
          size="icon"
          className="h-11 w-11 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
