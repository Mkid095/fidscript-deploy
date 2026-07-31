'use client';

import { Card, Button, Input } from '@fidscript/ui';
import { Icon } from '@iconify/react';

const PROVIDERS = [
  { value: 'internal', label: 'MinIO / Internal', desc: 'Built-in S3-compatible storage on this server', icon: 'icons8:database' },
  { value: 'cloudinary', label: 'Cloudinary', desc: 'Cloud-based image & video optimization, CDN delivery', icon: 'icons8:cloud' },
  { value: 'telegram', label: 'Telegram', desc: 'Store files as documents in a Telegram chat', icon: 'icons8:telegram' },
  { value: 's3', label: 'AWS S3', desc: 'Amazon S3 — scalable object storage', icon: 'icons8:hard-drive' },
];

interface Props {
  config: { defaultProvider?: string; cloudinaryCredsSet?: boolean; telegramCredsSet?: boolean } | null;
  onProviderChange: (provider: string) => void;
}

export function StorageSettingsProvider({ config, onProviderChange }: Props) {
  const defaultProvider = config?.defaultProvider ?? 'internal';

  return (
    <Card className="border border-[var(--rail)]" padding="lg">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[var(--rail)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon icon="icons8:hard-drive" width={14} height={14} className="text-[var(--text-dim)]" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-[var(--text)]">Default Storage Provider</h2>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Choose which provider to use when creating new buckets. You can override per bucket.</p>
        </div>
      </div>

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
              onClick={() => !isDisabled && onProviderChange(p.value)}
              disabled={isDisabled}
              className={`w-full text-left rounded-lg border p-3.5 transition-all duration-150 ${isActive ? 'border-[var(--accent)] bg-[var(--accent)]/5' : isDisabled ? 'border-[var(--rail)] opacity-50 cursor-not-allowed bg-[var(--surface-2)]' : 'border-[var(--rail)] hover:border-[var(--text-dim)] bg-[var(--surface-2)]'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Icon icon={p.icon} width={13} height={13} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[var(--text)]">{p.label}</span>
                      {isSet && <Icon icon="icons8:checkmark" width={11} height={11} className="text-emerald-400" />}
                      {!isSet && p.value !== 'internal' && <Icon icon="icons8:cancel" width={11} height={11} className="text-[var(--text-dim)]" />}
                      {isActive && <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">Active</span>}
                    </div>
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{p.desc}</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${isActive ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--text-dim)]'}`}>
                  {isActive && <div className="w-full h-full rounded-full bg-[var(--surface)] scale-[0.3]" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
