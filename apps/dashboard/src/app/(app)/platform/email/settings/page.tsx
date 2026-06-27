'use client';
/* eslint-disable import/order */

import { HugeiconsIcon } from '@hugeicons/react';

import { FloppyDiskIcon, SentIcon, CloudIcon, ViewIcon, ViewOffIcon, CheckmarkCircle01Icon, CancelCircleIcon, InboxIcon, RefreshIcon, LockIcon } from '@hugeicons/core-free-icons';

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
import type { StorageBackend, AdminAttachmentConfig } from '@fidscript/sdk';

import { useAuth } from '@/contexts/auth-context';

function mask(str: string): string {
  if (!str || str.length < 8) return '••••••••';
  return str.slice(0, 4) + '••••' + str.slice(-4);
}

const BACKEND_INFO: Record<StorageBackend, { label: string; description: string; icon: React.ReactNode }> = {
  internal: {
    label: 'Internal (VPS)',
    description: 'Store attachments on the platform VPS using MinIO S3-compatible storage. No external service required.',
    icon: <HugeiconsIcon icon={FloppyDiskIcon} size={14} strokeWidth={1.5} />,
  },
  telegram: {
    label: 'Telegram',
    description: 'Upload attachments to a private Telegram chat via the Bot API. Free and reliable for moderate traffic.',
    icon: <HugeiconsIcon icon={SentIcon} size={14} strokeWidth={1.5} />,
  },
  cloudinary: {
    label: 'Cloudinary',
    description: 'Upload attachments to Cloudinary CDN. Fast global delivery with transformation support.',
    icon: <HugeiconsIcon icon={CloudIcon} size={14} strokeWidth={1.5} />,
  },
};

export default function EmailAttachmentSettingsPage() {
  const sdk = useAuth().getSdk();

  // ── State ──────────────────────────────────────────────────────────────────

  const [config, setConfig] = useState<AdminAttachmentConfig | null>(null);
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
      const data = await sdk.email.attachmentConfig.get();
      setConfig(data);
      setSelectedProvider(data.provider);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoadingConfig(false);
    }
  }, [sdk]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setTestResult(null);
    try {
      const body: { provider: StorageBackend; credentials?: Record<string, string> } = { provider: selectedProvider };

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

      await sdk.email.attachmentConfig.update(body);
      await loadConfig();
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
      // ponytail: SDK exposes /test which takes the body. Build it inline.
      // Cast to any until test() is updated to accept credentials.
      const data = await sdk.email.attachmentConfig.test() as { ok: boolean; message?: string };
      setTestResult({ ok: data.ok, message: data.message ?? JSON.stringify(data) });
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
        <h1 className="text-xl font-bold text-[var(--text)] mb-1">Attachment Storage</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Choose where email attachment bytes are stored. Applies to all inbound and outbound mail on the platform.
        </p>
      </div>

      {configError && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-3 text-sm text-[var(--danger)]">
          {configError}{' '}
          <button className="underline ml-2" onClick={loadConfig}>Retry</button>
        </div>
      )}

      {/* Current status banner */}
      {config && (
        <div className="flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-4 py-3">
          <span className="text-lg">{BACKEND_INFO[config.provider].icon}</span>
          <div className="flex-1">
            <span className="text-sm text-[var(--text-muted)]">Currently active: </span>
            <span className="text-sm font-medium text-[var(--text)]">{BACKEND_INFO[config.provider].label}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.hasCredentials ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
            {config.hasCredentials ? 'credentials set' : 'no credentials'}
          </span>
        </div>
      )}

      {/* Settings form */}
      <Card className="border border-[var(--rail)] p-5">
        <form onSubmit={handleSave} noValidate>
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Storage Backend</h2>

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
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-slate-500'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                        <span>{info.icon}</span>
                        {info.label}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{info.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cloudinary credentials */}
          {selectedProvider === 'cloudinary' && (
            <div className="border border-[var(--rail)] rounded-lg p-4 mb-6 bg-[var(--surface-2)] space-y-4">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Cloudinary Credentials
              </h3>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Cloud Name</label>
                <Input
                  value={cloudName}
                  onChange={e => setCloudName(e.target.value)}
                  placeholder="my-cloud"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">API Key</label>
                <Input
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="123456789012345"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  API Secret
                  <span className="ml-2 text-[var(--text-dim)] normal-case font-normal">(shown masked after first save)</span>
                </label>
                <div className="relative">
                  <Input
                    type={showCloudinarySecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCloudinarySecret(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                  >
                    {showCloudinarySecret ? <HugeiconsIcon icon={ViewOffIcon} size={14} strokeWidth={1.5} /> : <HugeiconsIcon icon={ViewIcon} size={14} strokeWidth={1.5} />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Find these in your Cloudinary Dashboard → Settings → API Keys.</p>
              </div>
            </div>
          )}

          {/* Telegram credentials */}
          {selectedProvider === 'telegram' && (
            <div className="border border-[var(--rail)] rounded-lg p-4 mb-6 bg-[var(--surface-2)] space-y-4">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Telegram Bot Credentials
              </h3>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Bot Token</label>
                <div className="relative">
                  <Input
                    type={showBotToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={e => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                  >
                    {showBotToken ? <HugeiconsIcon icon={ViewOffIcon} size={14} strokeWidth={1.5} /> : <HugeiconsIcon icon={ViewIcon} size={14} strokeWidth={1.5} />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Get it from{' '}
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent)]">
                    @BotFather
                  </a>{' '}
                  — then add your bot to a private channel and forward a message to get the chat ID via{' '}
                  <a href="https://t.me/getidsbot" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent)]">
                    @getidsbot
                  </a>
                  .
                </p>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Chat / Channel ID</label>
                <Input
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                  placeholder="-1001234567890"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Numeric ID of the private channel or chat where files will be stored.</p>
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
              {testing ? 'Testing…' : ' Test Connection'}
            </Button>
            {testResult && (
              <p className={`text-xs mt-2 ${testResult.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {testResult.ok ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={1.5} /> : <HugeiconsIcon icon={CancelCircleIcon} size={14} strokeWidth={1.5} />} {testResult.message}
              </p>
            )}
          </div>

          {/* Save */}
          {saveError && (
            <div className="mb-3 text-[var(--danger)] text-xs">{saveError}</div>
          )}
          {saveSuccess && (
            <div className="mb-3 text-[var(--success)] text-xs"> Settings saved successfully.</div>
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
      <Card className="border border-[var(--rail)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">How it works</h3>
        <ul className="text-xs text-[var(--text-muted)] space-y-1.5">
          <li><HugeiconsIcon icon={InboxIcon} size={14} strokeWidth={1.5} className="inline" /> <strong className="text-[var(--text-muted)]">Inbound</strong> — When an email with attachments arrives, the system automatically downloads each attachment from Stalwart JMAP and uploads it to the configured storage.</li>
          <li><HugeiconsIcon icon={SentIcon} size={14} strokeWidth={1.5} className="inline" /> <strong className="text-[var(--text-muted)]">Outbound</strong> — Files attached when composing a message are uploaded to the chosen storage backend before sending.</li>
          <li><HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} className="inline" /> <strong className="text-[var(--text-muted)]">Already stored</strong> — Existing stored attachments are not moved when you switch backends.</li>
          <li><HugeiconsIcon icon={LockIcon} size={14} strokeWidth={1.5} className="inline" /> <strong className="text-[var(--text-muted)]">Credentials</strong> — Stored encrypted (AES-256-GCM) in the database and never exposed via the API.</li>
        </ul>
      </Card>
    </div>
  );
}
