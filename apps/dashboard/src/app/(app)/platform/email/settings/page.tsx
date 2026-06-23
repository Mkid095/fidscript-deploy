'use client';

/**
 * Attachment Storage Settings — platform admin UI.
 *
 * Controls where email attachment bytes are stored platform-wide:
 *   - Internal (MinIO/VPS)  — default, no credentials needed
 *   - Telegram             — store files in a Telegram chat via Bot API
 *   - Cloudinary            — store files via Cloudinary's upload API
 *
 * This page is for platform admins only. Changes apply to all future
 * email attachments (both inbound and outbound) across the platform.
 *
 * Layout mirrors the existing PlatformEmailPage: 3-column layout.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, Spinner } from '@fidscript/ui';

type StorageBackend = 'internal' | 'telegram' | 'cloudinary';

interface AttachmentConfig {
  provider: StorageBackend;
  isActive: boolean;
  hasCredentials: boolean;
}

function apiBase(): string {
  if (typeof window === 'undefined') return '';
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  return base.replace(/\/api$/, '');
}

function mask(str: string): string {
  if (!str || str.length < 8) return '••••••••';
  return str.slice(0, 4) + '••••' + str.slice(-4);
}

const BACKEND_INFO: Record<StorageBackend, { label: string; description: string; icon: string }> = {
  internal: {
    label: 'Internal (VPS)',
    description: 'Store attachments on the platform VPS using MinIO S3-compatible storage. No external service required.',
    icon: '💾',
  },
  telegram: {
    label: 'Telegram',
    description: 'Upload attachments to a private Telegram chat via the Bot API. Free and reliable for moderate traffic.',
    icon: '✈',
  },
  cloudinary: {
    label: 'Cloudinary',
    description: 'Upload attachments to Cloudinary CDN. Fast global delivery with transformation support.',
    icon: '☁',
  },
};

export default function EmailAttachmentSettingsPage() {
  // Auth token
  function getAccessToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '';
  }

  // ── State ──────────────────────────────────────────────────────────────────

  const [config, setConfig] = useState<AttachmentConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<StorageBackend>('internal');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cloudinary fields
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);

  // Telegram fields
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Load initial config ─────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    setConfigError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${apiBase()}/api/v1/admin/attachment-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      const data: AttachmentConfig = await res.json();
      setConfig(data);
      setSelectedProvider(data.provider);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTestResult(null);
    try {
      const token = await getAccessToken();
      const body: Record<string, unknown> = { provider: selectedProvider };

      if (selectedProvider === 'cloudinary') {
        if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
          setSaveError('Cloudinary: cloudName, apiKey, and apiSecret are all required.');
          setSaving(false);
          return;
        }
        body.credentials = { cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
      } else if (selectedProvider === 'telegram') {
        if (!botToken.trim() || !chatId.trim()) {
          setSaveError('Telegram: botToken and chatId are both required.');
          setSaving(false);
          return;
        }
        body.credentials = { botToken: botToken.trim(), chatId: chatId.trim() };
      }

      const res = await fetch(`${apiBase()}/api/v1/admin/attachment-config`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setConfig(data);
      setSelectedProvider(data.provider);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Test connection ─────────────────────────────────────────────────────────

  async function handleTest() {
    if (selectedProvider === 'internal') {
      setTestResult({ ok: true, message: 'Internal storage is always available (MinIO).' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const token = await getAccessToken();
      let body: Record<string, unknown> = { provider: selectedProvider };
      if (selectedProvider === 'cloudinary') {
        if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
          setTestResult({ ok: false, message: 'Fill in all Cloudinary fields first.' });
          setTesting(false);
          return;
        }
        body.credentials = { cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
      } else if (selectedProvider === 'telegram') {
        if (!botToken.trim() || !chatId.trim()) {
          setTestResult({ ok: false, message: 'Fill in both Telegram fields first.' });
          setTesting(false);
          return;
        }
        body.credentials = { botToken: botToken.trim(), chatId: chatId.trim() };
      }
      const res = await fetch(`${apiBase()}/api/v1/admin/attachment-config/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, message: data.message ?? JSON.stringify(data) });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-200 mb-1">Attachment Storage</h1>
        <p className="text-sm text-slate-500">
          Choose where email attachment bytes are stored. Applies to all inbound and outbound mail on the platform.
        </p>
      </div>

      {configError && (
        <div className="bg-red-950/30 border border-red-800 rounded-lg p-3 text-sm text-red-400">
          {configError}{' '}
          <button className="underline ml-2" onClick={loadConfig}>Retry</button>
        </div>
      )}

      {/* Current status banner */}
      {config && (
        <div className="flex items-center gap-3 bg-[#0f1117] border border-[#1e2130] rounded-lg px-4 py-3">
          <span className="text-lg">{BACKEND_INFO[config.provider].icon}</span>
          <div className="flex-1">
            <span className="text-sm text-slate-300">Currently active: </span>
            <span className="text-sm font-medium text-slate-100">{BACKEND_INFO[config.provider].label}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.hasCredentials ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            {config.hasCredentials ? 'credentials set' : 'no credentials'}
          </span>
        </div>
      )}

      {/* Settings form */}
      <Card className="border border-[#1e2130] p-5">
        <form onSubmit={handleSave} noValidate>
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Storage Backend</h2>

          {/* Provider radio cards */}
          <div className="space-y-3 mb-6">
            {(Object.keys(BACKEND_INFO) as StorageBackend[]).map(key => {
              const info = BACKEND_INFO[key];
              const isSelected = selectedProvider === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedProvider(key)}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-900/10'
                      : 'border-[#1e2130] bg-[#080a0d] hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        <span>{info.icon}</span>
                        {info.label}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{info.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cloudinary credentials */}
          {selectedProvider === 'cloudinary' && (
            <div className="border border-[#1e2130] rounded-lg p-4 mb-6 bg-[#080a0d] space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Cloudinary Credentials
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cloud Name</label>
                <Input
                  value={cloudName}
                  onChange={e => setCloudName(e.target.value)}
                  placeholder="my-cloud"
                  className="bg-[#0f1117] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">API Key</label>
                <Input
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="123456789012345"
                  className="bg-[#0f1117] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  API Secret
                  <span className="ml-2 text-slate-600 normal-case font-normal">(shown masked after first save)</span>
                </label>
                <div className="relative">
                  <Input
                    type={showCloudinarySecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="bg-[#0f1117] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCloudinarySecret(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    {showCloudinarySecret ? '🙈' : '👁'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Find these in your Cloudinary Dashboard → Settings → API Keys.</p>
              </div>
            </div>
          )}

          {/* Telegram credentials */}
          {selectedProvider === 'telegram' && (
            <div className="border border-[#1e2130] rounded-lg p-4 mb-6 bg-[#080a0d] space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Telegram Bot Credentials
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bot Token</label>
                <div className="relative">
                  <Input
                    type={showBotToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={e => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="bg-[#0f1117] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    {showBotToken ? '🙈' : '👁'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Get it from{' '}
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">
                    @BotFather
                  </a>{' '}
                  — then add your bot to a private channel and forward a message to get the chat ID via{' '}
                  <a href="https://t.me/getidsbot" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">
                    @getidsbot
                  </a>
                  .
                </p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Chat / Channel ID</label>
                <Input
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                  placeholder="-1001234567890"
                  className="bg-[#0f1117] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
                />
                <p className="text-[10px] text-slate-500 mt-1">Numeric ID of the private channel or chat where files will be stored.</p>
              </div>
            </div>
          )}

          {/* Test connection */}
          <div className="mb-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={testing}
              onClick={handleTest}
              disabled={selectedProvider !== 'internal' && (
                (selectedProvider === 'cloudinary' && (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim())) ||
                (selectedProvider === 'telegram' && (!botToken.trim() || !chatId.trim()))
              )}
            >
              {testing ? 'Testing…' : '⚡ Test Connection'}
            </Button>
            {testResult && (
              <p className={`text-xs mt-2 ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.ok ? '✅' : '❌'} {testResult.message}
              </p>
            )}
          </div>

          {/* Save */}
          {saveError && (
            <div className="mb-3 text-red-400 text-xs">{saveError}</div>
          )}
          {saveSuccess && (
            <div className="mb-3 text-emerald-400 text-xs">✓ Settings saved successfully.</div>
          )}
          <div className="flex gap-3">
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
            {selectedProvider !== 'internal' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProvider('internal');
                  setCloudName(''); setApiKey(''); setApiSecret('');
                  setBotToken(''); setChatId('');
                }}
              >
                Reset to Internal
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Info card */}
      <Card className="border border-[#1e2130] p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">How it works</h3>
        <ul className="text-xs text-slate-500 space-y-1.5">
          <li>📥 <strong className="text-slate-400">Inbound</strong> — When an email with attachments arrives, the system automatically downloads each attachment from Stalwart JMAP and uploads it to the configured storage.</li>
          <li>📤 <strong className="text-slate-400">Outbound</strong> — Files attached when composing a message are uploaded to the chosen storage backend before sending.</li>
          <li>🔄 <strong className="text-slate-400">Already stored</strong> — Existing stored attachments are not moved when you switch backends.</li>
          <li>🔒 <strong className="text-slate-400">Credentials</strong> — Stored encrypted (AES-256-GCM) in the database and never exposed via the API.</li>
        </ul>
      </Card>
    </div>
  );
}