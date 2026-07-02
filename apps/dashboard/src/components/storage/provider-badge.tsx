'use client';

import { Icon } from '@iconify/react';
import type { StorageProviderType } from '@/types';

const PROVIDERS: { value: StorageProviderType; label: string; icon: string }[] = [
  { value: 'internal',   label: 'Internal',   icon: 'icons8:database' },
  { value: 'cloudinary', label: 'Cloudinary', icon: 'icons8:database' },
  { value: 'telegram',   label: 'Telegram',   icon: 'icons8:share' },
  { value: 's3',         label: 'AWS S3',     icon: 'icons8:hdd' },
];

interface ProviderBadgeProps {
  provider: string;
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const p = PROVIDERS.find(x => x.value === provider);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--rail)] text-[var(--text-muted)]">
      {p && <Icon icon={p.icon} width={10} height={10} />}
      {p?.label ?? provider}
    </span>
  );
}
