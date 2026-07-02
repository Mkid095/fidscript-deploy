'use client';

import { Badge, Spinner } from '@fidscript/ui';

interface StatusBadgeProps {
  meta: { label: string; variant: string };
  acting: string | null;
  logStream: boolean;
}

export function StatusBadge({ meta, acting, logStream }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <Badge variant={meta.variant as any} className="text-sm">{meta.label}</Badge>
      {acting && <Spinner size="sm" />}
      {logStream && (
        <span className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Streaming
        </span>
      )}
    </div>
  );
}
