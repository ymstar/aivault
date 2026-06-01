'use client';

import { Suspense } from 'react';
import { ChatLayout } from '@/components/chat/chat-layout';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <ChatLayout />
    </Suspense>
  );
}
