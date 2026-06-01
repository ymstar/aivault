'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Loader2, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LLMConfig {
  id: string;
  label: string;
  provider_type: string;
  base_url: string;
  model: string;
  api_key_prefix: string | null;
  is_default: boolean;
}

interface LLMConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onConfigChange: () => void;
}

const PRESETS = [
  { label: 'OpenAI', providerType: 'openai_compatible' as const, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { label: 'DeepSeek', providerType: 'openai_compatible' as const, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'Anthropic', providerType: 'anthropic' as const, baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  { label: 'Mimo', providerType: 'openai_compatible' as const, baseUrl: 'https://token-plan-cn.xiaomimimo.com/anthropic', model: 'mimo-v2-pro' },
];

export function LLMConfigDialog({ open, onClose, onConfigChange }: LLMConfigDialogProps) {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; error?: string } | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [providerType, setProviderType] = useState<'openai_compatible' | 'anthropic'>('openai_compatible');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/configs');
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchConfigs();
  }, [open]);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setLabel(preset.label);
    setProviderType(preset.providerType);
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!label || !baseUrl || !model || !apiKey) return;
    setSaving(true);
    try {
      const res = await fetch('/api/chat/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, providerType, baseUrl, model, apiKey }),
      });
      if (res.ok) {
        setLabel(''); setBaseUrl(''); setModel(''); setApiKey('');
        setShowAdd(false);
        fetchConfigs();
        onConfigChange();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this LLM config?')) return;
    await fetch(`/api/chat/configs/${id}`, { method: 'DELETE' });
    fetchConfigs();
    onConfigChange();
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/chat/configs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    fetchConfigs();
    onConfigChange();
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/chat/configs/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ id, ok: data.ok, error: data.error });
    } catch {
      setTestResult({ id, ok: false, error: 'Network error' });
    }
    setTesting(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold">LLM Providers</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Existing configs */}
          {loading && <p className="text-center text-zinc-500 py-4">Loading...</p>}

          {!loading && configs.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{c.label}</p>
                  {c.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">default</span>}
                </div>
                <p className="text-xs text-zinc-500 truncate">{c.provider_type === 'anthropic' ? 'Anthropic' : 'OpenAI'} · {c.model} · {c.api_key_prefix}...</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!c.is_default && (
                  <button onClick={() => handleSetDefault(c.id)} className="p-1.5 rounded-md text-zinc-500 hover:text-yellow-400 hover:bg-zinc-800" title="Set as default">
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleTest(c.id)}
                  disabled={testing === c.id}
                  className="p-1.5 rounded-md text-zinc-500 hover:text-green-400 hover:bg-zinc-800"
                  title="Test connection"
                >
                  {testing === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {testResult && (
            <div className={`text-xs px-3 py-2 rounded-lg ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {testResult.ok ? 'Connection successful!' : `Failed: ${testResult.error}`}
            </div>
          )}

          {/* Presets */}
          {!showAdd && !loading && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Quick add from preset:</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add form */}
          {showAdd && (
            <div className="space-y-3 rounded-lg border border-zinc-700 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Add Provider</p>
                <button onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="My OpenAI" className="h-8 text-sm bg-zinc-800 border-zinc-700" />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Provider Type</label>
                <div className="flex gap-2">
                  {(['openai_compatible', 'anthropic'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setProviderType(t)}
                      className={`flex-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        providerType === t ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {t === 'anthropic' ? 'Anthropic' : 'OpenAI Compatible'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Base URL</label>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="h-8 text-sm bg-zinc-800 border-zinc-700" />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Model</label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o" className="h-8 text-sm bg-zinc-800 border-zinc-700" />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">API Key</label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="h-8 text-sm bg-zinc-800 border-zinc-700 pr-16"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300">
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving || !label || !baseUrl || !model || !apiKey} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
