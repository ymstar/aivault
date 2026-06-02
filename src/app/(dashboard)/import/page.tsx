'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileJson, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Platform = 'chatgpt' | 'claude' | 'claude-code' | 'gemini' | 'codex' | 'cursor' | 'opencode' | 'hermes';
type Status = 'idle' | 'uploading' | 'success' | 'error';

const platforms: { id: Platform; name: string; icon: string; desc: string; accept: string }[] = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖', desc: 'Settings → Data → Export', accept: '.json' },
  { id: 'claude', name: 'Claude Web', icon: '🧠', desc: 'Settings → Data → Export', accept: '.json' },
  { id: 'claude-code', name: 'Claude Code', icon: '⚡', desc: 'Terminal: use /export command', accept: '.txt,.md' },
  { id: 'gemini', name: 'Gemini', icon: '✨', desc: 'Google Takeout → Gemini', accept: '.json' },
  { id: 'codex', name: 'Codex CLI', icon: '🔧', desc: '~/.codex/sessions/ JSONL files', accept: '.jsonl' },
  { id: 'cursor', name: 'Cursor', icon: '🖱️', desc: 'Export from Cursor settings', accept: '.json' },
  { id: 'opencode', name: 'OpenCode', icon: '📖', desc: 'Export from OpenCode sessions', accept: '.json' },
  { id: 'hermes', name: 'Hermes Agent', icon: '🪽', desc: 'Agent JSONL or JSON export', accept: '.json,.jsonl' },
];

export default function ImportPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>('chatgpt');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<{ conversations: number; messages: number; duplicatesSkipped?: number } | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const selectedPlatform = platforms.find((p) => p.id === platform)!;

  const handleUpload = useCallback(async (file: File) => {
    setStatus('uploading');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform', platform);

      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult({ conversations: data.conversations, messages: data.messages, duplicatesSkipped: data.duplicatesSkipped || 0 });
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    }
  }, [platform]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }, [handleUpload]);

  const acceptLabel = selectedPlatform.accept.includes('jsonl')
    ? '.jsonl'
    : selectedPlatform.accept.includes('txt')
    ? '.txt .md'
    : '.json';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Import Conversations</h1>
        <p className="text-zinc-400">Upload your AI conversation exports to AIVault</p>
      </div>

      {/* Platform selector */}
      <div className="grid grid-cols-4 gap-3">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
              platform === p.id
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
            }`}
          >
            <span className="text-2xl">{p.icon}</span>
            <div>
              <p className="font-medium text-xs">{p.name}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Upload zone */}
      {status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition-all cursor-pointer ${
            dragOver
              ? 'border-indigo-500 bg-indigo-500/5 scale-[1.02]'
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="mb-4 h-10 w-10 text-zinc-500" />
          <p className="text-lg font-medium">Drop your file here</p>
          <p className="text-sm text-zinc-500">or click to browse</p>
          <div className="mt-4 flex gap-2">
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              {selectedPlatform.accept.includes('jsonl') ? (
                <>
                  <FileText className="mr-1 h-3 w-3" /> {acceptLabel}
                </>
              ) : selectedPlatform.accept.includes('txt') ? (
                <>
                  <FileText className="mr-1 h-3 w-3" /> {acceptLabel}
                </>
              ) : (
                <>
                  <FileJson className="mr-1 h-3 w-3" /> {acceptLabel}
                </>
              )}
            </Badge>
          </div>
          <input
            id="file-input"
            type="file"
            accept={selectedPlatform.accept}
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* Uploading */}
      {status === 'uploading' && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-zinc-300">Importing your conversations...</p>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
            <h3 className="text-xl font-bold text-green-300">Import Successful!</h3>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{result.conversations}</p>
                <p className="text-sm text-zinc-400">Conversations</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{result.messages}</p>
                <p className="text-sm text-zinc-400">Messages</p>
              </div>
              {(result.duplicatesSkipped ?? 0) > 0 && (
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{result.duplicatesSkipped}</p>
                  <p className="text-sm text-zinc-400">Duplicates skipped</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStatus('idle'); setResult(null); }}>
                Import More
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/conversations')}>
                View Conversations <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {status === 'error' && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <h3 className="text-xl font-bold text-red-300">Import Failed</h3>
            <p className="text-sm text-zinc-400">{error}</p>
            <Button variant="outline" onClick={() => { setStatus('idle'); setError(''); }}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
