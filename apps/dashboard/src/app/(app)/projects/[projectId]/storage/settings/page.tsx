'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Card, Button, Input, Spinner } from '@fidscript/ui';
import type { ProjectStorageConfig } from '@/types';
import { useAuth } from '@/contexts/auth-context';

const PROVIDERS = [
  {
    value: 'internal',
    label: 'MinIO / Internal',
    desc: 'Built-in S3-compatible storage on this server',
    icon: 'icons8:database',
  },
  {
    value: 'cloudinary',
    label: 'Cloudinary',
    desc: 'Cloud-based image & video optimization, CDN delivery',
    icon: 'icons8:cloud',
  },
  {
    value: 'telegram',
    label: 'Telegram',
    desc: 'Store files as documents in a Telegram chat',
    icon: 'icons8:telegram',
  },
  {
    value: 's3',
    label: 'AWS S3',
    desc: 'Amazon S3 — scalable object storage',
    icon: 'icons8:hard-drive',
  },
];

function Banner({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded border text-xs ${
      type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    }`}>
      <Icon icon={type === 'success' ? 'icons8:checkmark' : 'icons8:cancel'} width={12} height={12} />
      {message}
    </div>
  );
}

function SectionHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-[var(--rail)] flex items-center justify-center flex-shrink-0 mt-0.5">
        {children}
      </div>
      <div>
        <h2 className="text-xs font-semibold text-[var(--text)]">{title}</h2>
        <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function StorageSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getSdk } = useAuth();

  const [config, setConfig] = useState<ProjectStorageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cloudinary fields
  const [cloudName, setCloudName] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudApiSecret, setCloudApiSecret] = useState('');
  const [savingCloud, setSavingCloud] = useState(false);

  // Telegram fields
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [savingTg, setSavingTg] = useState(false);

  const showBanner = useCallback((message: string, type: 'success' | 'error') => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  const loadConfig = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const cfg = await sdk.storage.getStorageConfig(projectId);
      setConfig(cfg);
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to load config', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk, showBanner]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleProviderChange = async (provider: string) => {
    if (!projectId || !config) return;
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.updateStorageConfig(projectId, { defaultProvider: provider });
      setConfig(updated);
      showBanner('Default storage provider updated', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to update provider', 'error');
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
      showBanner('Cloudinary credentials saved', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
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
      showBanner('Telegram credentials saved', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
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
      showBanner('Cloudinary credentials removed', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to remove credentials', 'error');
    }
  };

  const handleDeleteTelegram = async () => {
    if (!projectId) return;
    if (!confirm('Remove Telegram credentials? This will disable Telegram storage for this project.')) return;
    try {
      const sdk = getSdk();
      const updated = await sdk.storage.deleteCredentials(projectId, 'telegram');
      setConfig(updated);
      showBanner('Telegram credentials removed', 'success');
    } catch (err) {
      showBanner(err instanceof Error ? err.message : 'Failed to remove credentials', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="md" />
      </div>
    );
  }

  const defaultProvider = config?.defaultProvider ?? 'internal';

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-dim)] mb-2">
        <Link href={`/projects/${projectId}/storage`} className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
          <Icon icon="icons8:left-arrow" width={11} height={11} />
          Storage
        </Link>
        <Icon icon="icons8:chevron-right" width={10} height={10} />
        <span className="text-[var(--text)] font-medium">Settings</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-0.5">Storage Settings</h1>
        <p className="text-xs text-[var(--text-dim)]">Configure storage providers and credentials for this project.</p>
      </div>

      {/* Banner */}
      {banner && <Banner message={banner.message} type={banner.type} />}

      {/* Default Provider */}
      <Card className="border border-[var(--rail)]" padding="lg">
        <SectionHeader
          title="Default Storage Provider"
          description="Choose which provider to use when creating new buckets. You can override per bucket."
        >
          <Icon icon="icons8:hard-drive" width={14} height={14} className="text-[var(--text-dim)]" />
        </SectionHeader>

        <div className="space-y-2">
          {PROVIDERS.map(p => {
            const isSet = p.value === 'internal' ||
              (p.value === 'cloudinary' && config?.cloudinaryCredsSet) ||
              (p.value === 'telegram' && config?.telegramCredsSet);
            const isActive = defaultProvider === p.value;
            const isDisabled = !isSet && p.value !== 'internal';

            return (
              <button
                key={p.value}
                type="button"
                onClick={() => !isDisabled && handleProviderChange(p.value)}
                disabled={isDisabled}
                className={`
                  w-full text-left rounded-lg border p-3.5 transition-all duration-150
                  ${isActive
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : isDisabled
                      ? 'border-[var(--rail)] opacity-50 cursor-not-allowed bg-[var(--surface-2)]'
                      : 'border-[var(--rail)] hover:border-[var(--text-dim)] bg-[var(--surface-2)]'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Icon icon={p.icon} width={13} height={13} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[var(--text)]">{p.label}</span>
                        {isSet && (
                          <Icon icon="icons8:checkmark" width={11} height={11} className="text-emerald-400" />
                        )}
                        {!isSet && p.value !== 'internal' && (
                          <Icon icon="icons8:cancel" width={11} height={11} className="text-[var(--text-dim)]" />
                        )}
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">Active</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                    isActive ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--text-dim)]'
                  }`}>
                    {isActive && <div className="w-full h-full rounded-full bg-[var(--surface)] scale-[0.3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Cloudinary */}
      <Card className="border border-[var(--rail)]" padding="lg">
        <SectionHeader
          title="Cloudinary"
          description="Connect your Cloudinary account to use it as a storage provider."
        >
          <Icon icon="icons8:cloud" width={14} height={14} className="text-[var(--text-dim)]" />
        </SectionHeader>

        {config?.cloudinaryCredsSet && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20">
            <Icon icon="icons8:checkmark" width={12} height={12} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] font-medium text-emerald-400">Cloudinary credentials are configured</span>
          </div>
        )}

        <form onSubmit={handleSaveCloudinary} noValidate className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">Cloud Name</label>
            <Input
              value={cloudName}
              onChange={e => setCloudName(e.target.value)}
              placeholder="e.g. my-cloud"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">API Key</label>
            <Input
              value={cloudApiKey}
              onChange={e => setCloudApiKey(e.target.value)}
              placeholder="e.g. 123456789012345"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">API Secret</label>
            <Input
              type="password"
              value={cloudApiSecret}
              onChange={e => setCloudApiSecret(e.target.value)}
              placeholder="Your Cloudinary API secret"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" variant="primary" size="sm" loading={savingCloud}
              className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
              {savingCloud ? 'Saving…' : 'Save Cloudinary Credentials'}
            </Button>
            {config?.cloudinaryCredsSet && (
              <Button type="button" variant="ghost" size="sm" onClick={handleDeleteCloudinary}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                Remove
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Telegram */}
      <Card className="border border-[var(--rail)]" padding="lg">
        <SectionHeader
          title="Telegram"
          description="Connect a Telegram bot to store files as documents in a chat."
        >
          <Icon icon="icons8:telegram" width={14} height={14} className="text-[var(--text-dim)]" />
        </SectionHeader>

        {config?.telegramCredsSet && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20">
            <Icon icon="icons8:checkmark" width={12} height={12} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] font-medium text-emerald-400">Telegram credentials are configured</span>
          </div>
        )}

        <form onSubmit={handleSaveTelegram} noValidate className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">Bot Token</label>
            <Input
              type="password"
              value={tgBotToken}
              onChange={e => setTgBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] mb-1.5">Chat ID</label>
            <Input
              value={tgChatId}
              onChange={e => setTgChatId(e.target.value)}
              placeholder="e.g. -1001234567890"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] text-xs"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" variant="primary" size="sm" loading={savingTg}
              className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]">
              {savingTg ? 'Saving…' : 'Save Telegram Credentials'}
            </Button>
            {config?.telegramCredsSet && (
              <Button type="button" variant="ghost" size="sm" onClick={handleDeleteTelegram}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                Remove
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
