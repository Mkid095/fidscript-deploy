'use client';

import type { ReactNode} from 'react';
import { Icon } from '@iconify/react';

interface Props {
  title: string;
  description: string;
  icon: string;
}

export function StorageSectionHeader({ title, description, icon }: Props) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-[var(--rail)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon icon={icon} width={14} height={14} className="text-[var(--text-dim)]" />
      </div>
      <div>
        <h2 className="text-xs font-semibold text-[var(--text)]">{title}</h2>
        <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{description}</p>
      </div>
    </div>
  );
}
