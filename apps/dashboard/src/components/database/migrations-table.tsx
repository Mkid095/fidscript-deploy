'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon, TerminalIcon, CloudIcon, UserIcon,
} from '@hugeicons/core-free-icons';
import { formatRelativeTime } from '@/lib/format';
import type { MigrationRecord } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  applied: 'text-emerald-400',
  pending: 'text-yellow-400',
  failed:  'text-rose-400',
};
const STATUS_BG: Record<string, string> = {
  applied: 'bg-emerald-500/10',
  pending: 'bg-yellow-500/10',
  failed:  'bg-rose-500/10',
};

function SourceIcon({ source }: { source?: string }) {
  if (source === 'cli') return <HugeiconsIcon icon={TerminalIcon} size={10} className="inline mr-0.5" />;
  if (source === 'api') return <HugeiconsIcon icon={CloudIcon} size={10} className="inline mr-0.5" />;
  return <HugeiconsIcon icon={UserIcon} size={10} className="inline mr-0.5" />;
}

interface MigrationsTableProps {
  migrations: MigrationRecord[];
}

export function MigrationsTable({ migrations }: MigrationsTableProps) {
  if (migrations.length === 0) {
    return <div className="p-8 text-center text-xs text-[var(--text-dim)]">No migrations recorded.</div>;
  }

  return (
    <table className="w-full text-xs">
      <thead className="bg-[var(--surface)]">
        <tr className="border-b border-[var(--rail)]">
          {['Status', 'Version', 'Name', 'Source', 'Applied by', 'Applied At', 'Error'].map(h => (
            <th key={h} className="text-left px-4 py-2.5 font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[9px]">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {migrations.map(m => (
          <tr key={m.id} className="border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20">
            <td className="px-4 py-2.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_BG[m.status] ?? ''} ${STATUS_COLOR[m.status] ?? ''}`}>
                {m.status.toUpperCase()}
              </span>
            </td>
            <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-dim)]">{m.version}</td>
            <td className="px-4 py-2.5 font-mono text-[var(--text-muted)]">{m.name}</td>
            <td className="px-4 py-2.5">
              {m.source && (
                <span className="text-[10px] text-[var(--text-dim)]">
                  <SourceIcon source={m.source} />
                  {m.source}
                </span>
              )}
            </td>
            <td className="px-4 py-2.5 text-[10px] text-[var(--text-dim)]">{m.appliedBy ?? '—'}</td>
            <td className="px-4 py-2.5 text-[var(--text-dim)]">
              {m.appliedAt ? formatRelativeTime(m.appliedAt) : <span className="opacity-30">—</span>}
            </td>
            <td className="px-4 py-2.5 text-rose-400 text-[10px] truncate max-w-32" title={m.error ?? ''}>
              {m.error ? (
                <span className="flex items-center gap-1">
                  <HugeiconsIcon icon={AlertCircleIcon} size={10} />
                  {m.error}
                </span>
              ) : <span className="opacity-30">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
