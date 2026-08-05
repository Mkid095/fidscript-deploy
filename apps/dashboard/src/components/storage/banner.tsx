'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import type { BannerProps } from './types';

export function Banner({ message, type }: BannerProps) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded border text-xs ${
      type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    }`}>
      <HugeiconsIcon
        icon={type === 'success' ? CheckmarkCircle01Icon : InformationCircleIcon}
        size={12}
      />
      {message}
    </div>
  );
}
