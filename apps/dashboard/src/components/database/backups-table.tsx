'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock02Icon, UserIcon, Archive01Icon,
} from '@hugeicons/core-free-icons';
import { formatBytes, formatRelativeTime, formatDuration } from '@/lib/format';
import { BackupActions } from './backup-actions';
import type { BackupRecord } from '@/types';

const statusColor: Record<string, string> = {
  completed:   'text-[var(--success)]',
  in_progress: 'text-[var(--warning)]',
  failed:      'text-[var(--danger)]',
};
const statusBg: Record<string, string> = {
  completed:   'bg-[var(--success)]/10',
  in_progress: 'bg-[var(--warning)]/10',
  failed:      'bg-[var(--danger)]/10',
};

interface BackupsTableProps {
  backups: BackupRecord[];
  restoring: string | null;
  onRestore: (id: string) => void;
  onCopyUrl: (url: string) => void;
}

export function BackupsTable({ backups, restoring, onRestore, onCopyUrl }: BackupsTableProps) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-[var(--surface)]">
        <tr className="border-b border-[var(--rail)]">
          {['Status', 'Type', 'Version', 'Bucket', 'Size', 'Created', 'Duration', ''].map(h => (
            <th key={h} className="text-left px-4 py-2.5 font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[9px]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {backups.map(bk => {
          const duration = bk.completedAt && bk.createdAt
            ? new Date(bk.completedAt).getTime() - new Date(bk.createdAt).getTime()
            : null;
          return (
            <tr key={bk.id} className="border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20">
              {/* Status */}
              <td className="px-4 py-2.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBg[bk.status] ?? ''} ${statusColor[bk.status] ?? ''}`}>
                  {bk.status === 'in_progress' ? 'IN PROGRESS' : bk.status.toUpperCase()}
                </span>
              </td>

              {/* Type */}
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1 text-[10px] ${
                  bk.type === 'scheduled' ? 'text-[var(--text-dim)]' : 'text-[var(--text-muted)]'
                }`}>
                  <HugeiconsIcon icon={bk.type === 'scheduled' ? Clock02Icon : UserIcon} size={11} />
                  {bk.type === 'scheduled' ? 'Scheduled' : 'Manual'}
                </span>
              </td>

              {/* Version */}
              <td className="px-4 py-2.5">
                {bk.versionLabel ? (
                  <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--rail)]">
                    {bk.versionLabel}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text-dim)]">—</span>
                )}
              </td>

              {/* Bucket */}
              <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-dim)]">
                <div className="flex items-center gap-1">
                  <HugeiconsIcon icon={Archive01Icon} size={10} className="text-[var(--text-dim)]" />
                  {bk.storageBucket ?? '—'}
                </div>
              </td>

              {/* Size */}
              <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-muted)]">
                {bk.sizeBytes > 0 ? (
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Archive01Icon} size={10} className="text-[var(--text-dim)]" />
                    {formatBytes(bk.sizeBytes)}
                  </span>
                ) : '—'}
              </td>

              {/* Created */}
              <td className="px-4 py-2.5 text-[var(--text-dim)]">{formatRelativeTime(bk.createdAt)}</td>

              {/* Duration */}
              <td className="px-4 py-2.5 text-[var(--text-dim)]">
                {duration !== null ? formatDuration(duration) : '—'}
              </td>

              {/* Actions */}
              <td className="px-4 py-2.5">
                <BackupActions
                  backupId={bk.id}
                  url={bk.url}
                  status={bk.status}
                  restoring={restoring}
                  onRestore={onRestore}
                  onCopyUrl={onCopyUrl}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
