'use client';

import { Button, Input, Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { FloppyDiskIcon, SentIcon, CloudIcon, ViewIcon, ViewOffIcon, CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import type { StorageBackend } from '@fidscript-deploy/sdk';

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

interface Props {
  selectedProvider: StorageBackend;
  setSelectedProvider: (v: StorageBackend) => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  testResult: { ok: boolean; message: string } | null;
  testing: boolean;
  cloudName: string; setCloudName: (v: string) => void;
  apiKey: string; setApiKey: (v: string) => void;
  apiSecret: string; setApiSecret: (v: string) => void;
  showCloudinarySecret: boolean; setShowCloudinarySecret: (v: boolean | ((prev: boolean) => boolean)) => void;
  botToken: string; setBotToken: (v: string) => void;
  chatId: string; setChatId: (v: string) => void;
  showBotToken: boolean; setShowBotToken: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSave: (e: React.FormEvent) => void;
  onTest: () => void;
}

export function EmailSettingsForm({
  selectedProvider, setSelectedProvider,
  saving, saveError, saveSuccess, testResult, testing,
  cloudName, setCloudName,
  apiKey, setApiKey,
  apiSecret, setApiSecret, showCloudinarySecret, setShowCloudinarySecret,
  botToken, setBotToken, chatId, setChatId, showBotToken, setShowBotToken,
  onSave, onTest,
}: Props) {
  const isDisabled = (selectedProvider === 'cloudinary' && (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim())) ||
    (selectedProvider === 'telegram' && (!botToken.trim() || !chatId.trim()));

  return (
    <Card className="border border-[var(--rail)] p-5">
      <form onSubmit={onSave} noValidate>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Storage Backend</h2>
        <div className="space-y-3 mb-6">
          {(Object.keys(BACKEND_INFO) as StorageBackend[]).map(key => {
            const info = BACKEND_INFO[key];
            const isSelected = selectedProvider === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedProvider(key)}
                className={`w-full text-left rounded-lg border p-4 transition-all ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-slate-500'}`}>
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
        {selectedProvider === 'cloudinary' && (
          <div className="border border-[var(--rail)] rounded-lg p-4 mb-6 bg-[var(--surface-2)] space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Cloudinary Credentials</h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Cloud Name</label>
              <Input value={cloudName} onChange={e => setCloudName(e.target.value)} placeholder="my-cloud"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">API Key</label>
              <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="123456789012345"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">API Secret</label>
              <div className="relative">
                <Input type={showCloudinarySecret ? 'text' : 'password'} value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder=".............."
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full pr-10" />
                <button type="button" onClick={() => setShowCloudinarySecret(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]">
                  {showCloudinarySecret ? <HugeiconsIcon icon={ViewOffIcon} size={14} strokeWidth={1.5} /> : <HugeiconsIcon icon={ViewIcon} size={14} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>
        )}
        {selectedProvider === 'telegram' && (
          <div className="border border-[var(--rail)] rounded-lg p-4 mb-6 bg-[var(--surface-2)] space-y-4">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Telegram Bot Credentials</h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Bot Token</label>
              <div className="relative">
                <Input type={showBotToken ? 'text' : 'password'} value={botToken} onChange={e => setBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full pr-10" />
                <button type="button" onClick={() => setShowBotToken(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]">
                  {showBotToken ? <HugeiconsIcon icon={ViewOffIcon} size={14} strokeWidth={1.5} /> : <HugeiconsIcon icon={ViewIcon} size={14} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Chat / Channel ID</label>
              <Input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="-1001234567890"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
            </div>
          </div>
        )}
        <div className="mb-6">
          <Button type="button" variant="ghost" size="sm" loading={testing} onClick={onTest} disabled={isDisabled}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          {testResult && (
            <p className={`text-xs mt-2 ${testResult.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {testResult.ok ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={1.5} /> : <HugeiconsIcon icon={CancelCircleIcon} size={14} strokeWidth={1.5} />}
              {' '}{testResult.message}
            </p>
          )}
        </div>
        {saveError && <div className="mb-3 text-[var(--danger)] text-xs">{saveError}</div>}
        {saveSuccess && <div className="mb-3 text-[var(--success)] text-xs"> Settings saved successfully.</div>}
        <div className="flex gap-3">
          <Button variant="primary" size="sm" type="submit" loading={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {selectedProvider !== 'internal' && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedProvider('internal'); setCloudName(''); setApiKey(''); setApiSecret(''); setBotToken(''); setChatId(''); }}>
              Reset to Internal
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
