'use client';

import { Icon } from '@iconify/react';
import type { BannerProps } from './types';

export function Banner({ message, type }: BannerProps) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded border text-xs ${
      type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    }`}>
      <Icon
        icon={type === 'success' ? 'icons8:checkmark' : 'icons8:info'}
        width={12}
        height={12}
      />
      {message}
    </div>
  );
}
