'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const platformColors: Record<string, string> = {
  CHATGPT: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLAUDE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ConversationDetail {
  id: string;
  title: string;
  platform: string;
  created_at: string;
  messages: Message[];
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/conversations/${params.id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setConv(data);
      } catch { setConv(null); }
      setLoading(false);
    }
    if (params.id) load();
  }, [params.id]);

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
        <p className="text-sm text-zinc-500">
          {conv.messages?.length || 0} messages · {new Date(conv.created_at).toLocaleString()}
        </p>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {conv.messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700">
                <User className="h-4 w-4 text-zinc-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
