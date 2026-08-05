'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckCircle } from '@hugeicons/core-free-icons';

export interface FunctionVersionRowProps {
  version: string;
  createdAt: string;
  status: string;
  isLatest: boolean;
}

export function FunctionVersionRow({ version, createdAt, status, isLatest }: FunctionVersionRowProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--rail)]/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-[var(--text)]">v{version}</code>
          {isLatest && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              <HugeiconsIcon icon={CheckCircle} size={10} />
              Latest
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
        status === 'ACTIVE'
          ? 'bg-emerald-500/10 text-emerald-400'
          : status === 'FAILED'
          ? 'bg-rose-500/10 text-rose-400'
          : 'bg-[var(--rail)] text-[var(--text-muted)]'
      }`}>
        {status}
      </span>
    </div>
  );
}
