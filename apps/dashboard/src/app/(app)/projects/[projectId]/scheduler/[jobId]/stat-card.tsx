'use client';

import { Card } from '@fidscript/ui';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
// Hugeicons type is internal — use any for the prop type.
// (removed)

interface Props {
  label: string;
  value: string;
  icon: IconSvgElement;
  valueColor?: string;
}

export function StatCard({ label, value, icon: IconComponent, valueColor }: Props) {
  return (
    <Card className="border border-[var(--rail)]" padding="sm">
      <div className="flex items-center gap-2 mb-1">
        <HugeiconsIcon icon={IconComponent} size={11} className="text-[var(--text-dim)]" />
        <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm font-medium text-[var(--text)] truncate ${valueColor ?? ''}`}>{value}</p>
    </Card>
  );
}
