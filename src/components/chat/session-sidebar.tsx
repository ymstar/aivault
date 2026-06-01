'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, MessageSquare, Trash2, Download, MoreHorizontal, Search, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Session {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

interface SessionSidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

function groupSessions(sessions: Session[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; sessions: Session[] }[] = [
    { label: 'Today', sessions: [] },
    { label: 'Yesterday', sessions: [] },
    { label: 'Previous 7 Days', sessions: [] },
    { label: 'Older', sessions: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.updated_at);
    if (d >= today) groups[0].sessions.push(s);
    else if (d >= yesterday) groups[1].sessions.push(s);
    else if (d >= weekAgo) groups[2].sessions.push(s);
    else groups[3].sessions.push(s);
  }

  return groups.filter((g) => g.sessions.length > 0);
}

export function SessionSidebar({ sessions, activeSessionId, onNewChat, onDelete, onExport }: SessionSidebarProps) {
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = search
    ? sessions.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  const groups = groupSessions(filtered);

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 border-r border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold">AIVault</span>
        </Link>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white justify-start gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="h-8 pl-8 text-xs bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {group.label}
            </p>
            {group.sessions.map((s) => (
              <div key={s.id} className="relative">
                <Link href={`/chat?session=${s.id}`}>
                  <div
                    className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer transition-colors ${
                      activeSessionId === s.id
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                    onClick={() => setOpenMenu(null)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{s.title}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenu(openMenu === s.id ? null : s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 transition-opacity"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Link>

                {/* Context menu */}
                {openMenu === s.id && (
                  <div className="absolute right-2 top-8 z-50 w-36 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl py-1">
                    <button
                      onClick={() => { onExport(s.id); setOpenMenu(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Download className="h-3 w-3" /> Export
                    </button>
                    <button
                      onClick={() => { onDelete(s.id); setOpenMenu(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {sessions.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-zinc-600">No chat sessions yet</p>
        )}
      </div>
    </div>
  );
}
