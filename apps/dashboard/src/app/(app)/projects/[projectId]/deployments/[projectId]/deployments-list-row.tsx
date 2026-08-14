'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, GitBranchIcon } from '@hugeicons/core-free-icons';
import type { Deployment } from '@/types';
import { statusMeta, isInFlight, relativeTime, formatDuration } from '@/components/deployments';

function statusBadgeVariant(status?: string): string {
  const meta = statusMeta(status);
  const map: Record<string, string> = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    danger: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    default: 'bg-[var(--rail)] border-[var(--rail)] text-[var(--text-muted)]',
  };
  return map[meta.variant] ?? map.default;
}

interface DeploymentsListRowProps {
  deployment: Deployment;
  projectId: string;
}

export function DeploymentsListRow({ deployment: d, projectId }: DeploymentsListRowProps) {
  const router = useRouter();
  const inFlight = isInFlight(d.status);
  const meta = statusMeta(d.status);

  return (
    <tr className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {inFlight && <StreamingDot />}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadgeVariant(d.status)}`}>
            {meta.label}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {d.branch ? (
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <HugeiconsIcon icon={GitBranchIcon} size={11} />
            {d.branch}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-dim)]">—</span>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {d.commitSha ? (
          <code className="text-xs font-mono text-[var(--text-muted)]">{d.commitSha.slice(0, 7)}</code>
        ) : (
          <span className="text-xs text-[var(--text-dim)]">—</span>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {d.imageTag ? (
          <code className="text-xs font-mono text-[var(--text-dim)]">{d.imageTag}</code>
        ) : (
          <span className="text-xs text-[var(--text-dim)]">—</span>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-[var(--text-muted)]">{relativeTime(d.createdAt)}</span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-[var(--text-muted)]">
          {d.completedAt
            ? formatDuration(d.createdAt, d.completedAt)
            : inFlight ? 'In progress' : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/deployments/${d.id}`)}
        >
          View <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
        </Button>
      </td>
    </tr>
  );
}

function StreamingDot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse flex-shrink-0" />;
}
