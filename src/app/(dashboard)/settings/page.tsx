'use client';

import { useState, useEffect } from 'react';
import { Loader2, Crown, Shield, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface UserData {
  id: string;
  email: string;
  name: string;
  plan: string;
  created_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-zinc-400">Manage your account and preferences</p>
      </div>

      {/* Account */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Name</p>
              <p className="font-medium">{user?.name || 'Not set'}</p>
            </div>
          </div>
          <Separator className="bg-zinc-800" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Email</p>
              <p className="font-medium">{user?.email || 'Not set'}</p>
            </div>
          </div>
          <Separator className="bg-zinc-800" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Member since</p>
              <p className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-lg px-3 py-1">
                {user?.plan || 'FREE'}
              </Badge>
            </div>
            <Button variant="outline" className="border-zinc-700" onClick={() => alert('Coming soon!')}>
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Irreversible actions. Please be careful.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => { if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) { alert('Coming soon!'); } }}>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
