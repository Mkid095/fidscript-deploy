'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Database01Icon,
  CloudIcon,
  TelegramIcon,
  HardDriveIcon,
} from '@hugeicons/core-free-icons';
import type { StorageProviderType } from '@/types';

const PROVIDERS: { value: StorageProviderType; label: string; icon: typeof HardDriveIcon }[] = [
  { value: 'internal',   label: 'Internal',   icon: Database01Icon },
  { value: 'cloudinary', label: 'Cloudinary', icon: CloudIcon },
  { value: 'telegram',   label: 'Telegram',   icon: TelegramIcon },
  { value: 's3',         label: 'AWS S3',     icon: HardDriveIcon },
];

interface ProviderBadgeProps {
  provider: string;
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const p = PROVIDERS.find(x => x.value === provider);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--rail)] text-[var(--text-muted)]">
      {p && <HugeiconsIcon icon={p.icon} size={10} />}
      {p?.label ?? provider}
    </span>
  );
}
