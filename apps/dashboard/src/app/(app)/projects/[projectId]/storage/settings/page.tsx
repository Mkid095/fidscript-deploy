'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { ProjectStorageConfig } from '@fidscript/sdk/modules/storage';
import { Card, Button, Input, Spinner, Toast } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircleIcon,
  CancelCircleIcon,
} from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';

const PROVIDERS = [
  { value: 'internal', label: 'MinIO (Internal)', desc: 'Built-in S3-compatible storage on this server' },
  { value: 'cloudinary', label: 'Cloudinary', desc: 'Cloud-based image & video optimization, CDN delivery' },
  { value: 'telegram', label: 'Telegram', desc: 'Store files as documents in a Telegram chat' },
];

export default function StorageSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getSdk } = useAuth();

  const [config, setConfig] = useState<ProjectStorageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cloudinary fields
  const [cloudName, setCloudName] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudApiSecret, setCloudApiSecret] = useState('');
  const [savingCloud, setSavingCloud] = useState(false);

  // Telegram fields
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [savingTg, setSavingTg] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const loadConfig = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const cfg = await sdk.storage.getStorageConfig(projectId);
      setConfig(cfg);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load config', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleProviderChange = async (provider: string) => {
    if (!projectId || !config) return;
    setSaving(true);
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.updateStorageConfig(projectId, { defaultProvider: provider });
      setConfig(updated);
      showToast('Default provider updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update provider', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCloudinary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSavingCloud(true);
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.setCloudinaryCredentials(projectId, {
        cloudName: cloudName.trim(),
        apiKey: cloudApiKey.trim(),
        apiSecret: cloudApiSecret.trim(),
      });
      setConfig(updated);
      setCloudName(''); setCloudApiKey(''); setCloudApiSecret('');
      showToast('Cloudinary credentials saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
    } finally {
      setSavingCloud(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSavingTg(true);
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.setTelegramCredentials(projectId, {
        botToken: tgBotToken.trim(),
        chatId: tgChatId.trim(),
      });
      setConfig(updated);
      setTgBotToken(''); setTgChatId('');
      showToast('Telegram credentials saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
    } finally {
      setSavingTg(false);
    }
  };

  const handleDeleteCloudinary = async () => {
    if (!projectId) return;
    if (!confirm('Remove Cloudinary credentials? This will disable Cloudinary storage for this project.')) return;
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.deleteCredentials(projectId, 'cloudinary');
      setConfig(updated);
      showToast('Cloudinary credentials removed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove credentials', 'error');
    }
  };

  const handleDeleteTelegram = async () => {
    if (!projectId) return;
    if (!confirm('Remove Telegram credentials? This will disable Telegram storage for this project.')) return;
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.deleteCredentials(projectId, 'telegram');
      setConfig(updated);
      showToast('Telegram credentials removed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove credentials', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const defaultProvider = config?.defaultProvider ?? 'internal';

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-dim)] mb-6">
        <Link href="/storage" className="hover:text-[var(--text)] transition-colors">Storage</Link>
        <span>/</span>
        <span className="text-[var(--text)]">Settings</span>
      </div>

      <div className="space-y-6">
        {/* Default Provider */}
        <Card className="border border-[var(--rail)]" padding="lg">
          <h2 className="text-base font-semibold text-[var(--text)] mb-1">Default Storage Provider</h2>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Choose which provider to use when creating new buckets. You can override per bucket.
          </p>

          <div className="space-y-3">
            {PROVIDERS.map(p => {
              const isSet = p.value === 'internal' ||
                (p.value === 'cloudinary' && config?.cloudinaryCredsSet) ||
                (p.value === 'telegram' && config?.telegramCredsSet);
              const isActive = defaultProvider === p.value;

              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleProviderChange(p.value)}
                  disabled={saving || (!isSet && p.value !== 'internal')}
                  className={`
                    w-full text-left rounded-lg border p-4 transition-all
                    ${isActive
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : isSet
                        ? 'border-[var(--rail)] hover:border-[var(--text-dim)] bg-[var(--surface-2)]'
                        : 'border-[var(--rail)] opacity-50 cursor-not-allowed bg-[var(--surface-2)]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text)]">{p.label}</span>
                        {isSet && (
                          <HugeiconsIcon icon={CheckmarkCircleIcon} size={14} className="text-[var(--success)]" />
                        )}
                        {!isSet && p.value !== 'internal' && (
                          <HugeiconsIcon icon={CancelCircleIcon} size={14} className="text-[var(--text-dim)]" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      isActive ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--text-dim)]'
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>
          {saving && <p className="text-xs text-[var(--text-muted)] mt-3">Saving...</p>}
        </Card>

        {/* Cloudinary Credentials */}
        <Card className="border border-[var(--rail)]" padding="lg">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-[var(--text)]">Cloudinary</h2>
            {config?.cloudinaryCredsSet && (
              <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                <HugeiconsIcon icon={CheckmarkCircleIcon} size={12} /> Configured
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Connect your Cloudinary account to use it as a storage provider.
          </p>

          <form onSubmit={handleSaveCloudinary} noValidate className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Cloud Name</label>
              <Input
                value={cloudName}
                onChange={e => setCloudName(e.target.value)}
                placeholder="e.g. my-cloud"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">API Key</label>
              <Input
                value={cloudApiKey}
                onChange={e => setCloudApiKey(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">API Secret</label>
              <Input
                type="password"
                value={cloudApiSecret}
                onChange={e => setCloudApiSecret(e.target.value)}
                placeholder="Your Cloudinary API secret"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" variant="primary" size="sm" loading={savingCloud}>
                {savingCloud ? 'Saving...' : 'Save Cloudinary Credentials'}
              </Button>
              {config?.cloudinaryCredsSet && (
                <Button type="button" variant="ghost" size="sm" onClick={handleDeleteCloudinary}
                  className="text-[var(--danger)]">
                  Remove
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Telegram Credentials */}
        <Card className="border border-[var(--rail)]" padding="lg">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-[var(--text)]">Telegram</h2>
            {config?.telegramCredsSet && (
              <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                <HugeiconsIcon icon={CheckmarkCircleIcon} size={12} /> Configured
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Connect a Telegram bot to store files as documents in a chat.
          </p>

          <form onSubmit={handleSaveTelegram} noValidate className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Bot Token</label>
              <Input
                type="password"
                value={tgBotToken}
                onChange={e => setTgBotToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Chat ID</label>
              <Input
                value={tgChatId}
                onChange={e => setTgChatId(e.target.value)}
                placeholder="e.g. -1001234567890"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" variant="primary" size="sm" loading={savingTg}>
                {savingTg ? 'Saving...' : 'Save Telegram Credentials'}
              </Button>
              {config?.telegramCredsSet && (
                <Button type="button" variant="ghost" size="sm" onClick={handleDeleteTelegram}
                  className="text-[var(--danger)]">
                  Remove
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}