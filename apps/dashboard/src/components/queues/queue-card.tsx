'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Card } from '@fidscript/ui';

export interface Queue {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface QueueStats {
  pending: number;
  delivered: number;
  deadLettered: number;
  jsDepth: number;
}

const TYPE_ICONS: Record<string, string> = {
  redis:     'icons8:database',
  jetstream:  'icons8:share',
  nats:       'icons8:share',
  memory:     'icons8:database',
};

const TYPE_LABELS: Record<string, string> = {
  redis:    'Redis',
  jetstream: 'NATS JetStream',
  nats:      'NATS',
  memory:    'Memory',
};

interface QueueCardProps {
  queue: Queue;
  stats?: QueueStats;
  projectId: string;
  onDelete: (queue: Queue) => void;
}

export function QueueCard({ queue, stats, projectId, onDelete }: QueueCardProps) {
  const router = useRouter();

  const typeIcon = TYPE_ICONS[queue.type] ?? 'icons8:share';
  const typeLabel = TYPE_LABELS[queue.type] ?? queue.type;
  const isPaused = queue.status === 'paused';
  const hasPending = (stats?.pending ?? 0) > 0;

  return (
    <div className="relative group">
      <button
        onClick={() => router.push(`/projects/${projectId}/queues/${queue.id}`)}
        className="w-full text-left"
      >
        <Card
          className="border border-[var(--rail)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] transition-all duration-150 pr-16"
          padding="md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-[var(--rail)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon icon={typeIcon} width={15} height={15} className="text-[var(--text-dim)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold text-[var(--text)] truncate">{queue.name}</h3>
                  {isPaused && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Paused
                    </span>
                  )}
                  {hasPending && !isPaused && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[var(--text-dim)] mb-2">
                  <span className="flex items-center gap-1">
                    <Icon icon="icons8:share" width={10} height={10} />
                    {typeLabel}
                  </span>
                  <span>·</span>
                  <span>ID: {queue.id}</span>
                  <span>·</span>
                  <span>Created {new Date(queue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>

                {stats && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Icon icon="icons8:tasks" width={10} height={10} className="text-[var(--text-dim)]" />
                      <span className="text-[10px] text-[var(--text-dim)]">
                        <span className="text-[var(--text)] font-medium">{stats.pending}</span> pending
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon icon="icons8:checked" width={10} height={10} className="text-emerald-400" />
                      <span className="text-[10px] text-[var(--text-dim)]">
                        <span className="text-[var(--text)] font-medium">{stats.delivered}</span> delivered
                      </span>
                    </div>
                    {stats.deadLettered > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Icon icon="icons8:cancel" width={10} height={10} className="text-rose-400" />
                        <span className="text-[10px] text-rose-400">
                          <span className="font-medium">{stats.deadLettered}</span> dead-letter
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[var(--rail)] group-hover:bg-[var(--accent)]/10 transition-colors">
                <Icon icon="icons8:chevron-right" width={12} height={12} className="text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors" />
              </div>
            </div>
          </div>
        </Card>
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(queue); }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--text-dim)] hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete queue"
      >
        <Icon icon="icons8:trash" width={13} height={13} />
      </button>
    </div>
  );
}
