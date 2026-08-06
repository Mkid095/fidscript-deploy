'use client';

import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronLeftIcon } from '@hugeicons/core-free-icons';
import type { Queue } from './use-queues-realtime';

const TYPE_LABELS: Record<string, string> = {
  stream:    'NATS JetStream',
  queue:     'Redis Queue',
  workqueue: 'Work Queue',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20',
  delivered:  'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20',
  'dead-letter': 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20',
  active:     'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20',
  paused:     'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20',
};

interface QueueDetailHeaderProps {
  queue: Queue;
  projectId: string;
}

export function QueueDetailHeader({ queue, projectId }: QueueDetailHeaderProps) {
  const router = useRouter();
  const typeLabel = TYPE_LABELS[queue.type] ?? queue.type;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.push(`/projects/${projectId}/queues`)}
        className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/30 transition-all"
      >
        <HugeiconsIcon icon={ChevronLeftIcon} size={14} />
      </button>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h1 className="text-base font-semibold text-[var(--text)]">{queue.name}</h1>
            {queue.status && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLORS[queue.status] ?? ''}`}>
                {queue.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
            <span>{typeLabel}</span>
            <span>·</span>
            <span>ID: {queue.id}</span>
            <span>·</span>
            <span>Created {new Date(queue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
