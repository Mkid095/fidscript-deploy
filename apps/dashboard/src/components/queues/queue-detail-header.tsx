'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import type { Queue } from './use-queues-realtime';

const TYPE_LABELS: Record<string, string> = {
  stream:    'NATS JetStream',
  queue:     'Redis Queue',
  workqueue: 'Work Queue',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  delivered:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'dead-letter': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  active:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  paused:     'text-amber-400 bg-amber-500/10 border-amber-500/20',
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
        <Icon icon="icons8:chevron-left" width={14} height={14} />
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
