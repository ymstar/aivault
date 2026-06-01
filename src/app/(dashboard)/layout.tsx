'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import {
  LayoutDashboard, MessageSquare, Upload, Search, Settings, Shield, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const synced = useRef(false);

  // Sync user to Supabase on first load
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    fetch('/api/sync-user', { method: 'POST' }).catch(console.error);
  }, []);

  const sidebar = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold">AIVault</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  const pageTitle = sidebarLinks.find(l => pathname.startsWith(l.href))?.label || 'Dashboard';

  // Chat page manages its own full-height layout
  if (pathname === '/chat') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-zinc-800 bg-zinc-900/50">
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-zinc-900 p-0 border-zinc-800">
                {sidebar}
              </SheetContent>
            </Sheet>
            <p className="text-sm text-zinc-400">
              AIVault <span className="text-zinc-600">/</span> <span className="text-zinc-200">{pageTitle}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-zinc-400 hidden sm:inline">{user.firstName || user.emailAddresses?.[0]?.emailAddress}</span>}
            <UserButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
