'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Crown, Shield, Trash2, Key, Plus, Copy, Check, Eye, EyeOff, X } from 'lucide-react';
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

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<{ rawKey: string; name: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/keys');
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys || []);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'default' }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey({ rawKey: data.key, name: data.name });
        setKeyName('');
        fetchKeys();
      }
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this API key? Any collector using it will stop working.')) return;
    await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
    fetchKeys();
  };

  const copyKey = () => {
    if (newKey?.rawKey) {
      navigator.clipboard.writeText(newKey.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

      {/* API Keys */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> API Keys
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Connect external tools like Claude Code Collector to AIVault
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New key reveal */}
          {newKey && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-400">✓ Key generated — copy it now, it won't be shown again!</p>
                <button onClick={() => setNewKey(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-800 rounded px-3 py-2 text-sm text-green-300 font-mono break-all">
                  {newKey.rawKey}
                </code>
                <Button size="sm" variant="outline" className="border-zinc-700 shrink-0" onClick={copyKey}>
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Generate form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name (e.g. mac-collector)"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <Button
              onClick={generateKey}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Generate
            </Button>
          </div>

          {/* Key list */}
          {keys.length > 0 && (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{k.name}</span>
                      <code className="text-xs text-zinc-500 font-mono">{k.key_prefix}</code>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => deleteKey(k.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {keys.length === 0 && !newKey && (
            <p className="text-sm text-zinc-500 text-center py-2">No API keys yet</p>
          )}
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
