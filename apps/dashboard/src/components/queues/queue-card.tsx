'use client';

import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Share01Icon, ChevronRightIcon, Delete02Icon, Task01Icon, CheckmarkCircle01Icon, Cancel01Icon, Database01Icon } from '@hugeicons/core-free-icons';
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
  acknowledged: number;
  failed: number;
  deadLettered: number;
  jsDepth: number;
}

interface QueueCardProps {
  queue: Queue;
  stats?: QueueStats;
  projectId: string;
  onDelete: (queue: Queue) => void;
}

const QUEUE_TYPE_CONFIG: Record<string, { icon: typeof Share01Icon; label: string }> = {
  stream:    { icon: Share01Icon, label: 'NATS JetStream' },
  queue:     { icon: Database01Icon, label: 'Redis Queue' },
  workqueue: { icon: Share01Icon, label: 'Work Queue' },
};

export function QueueCard({ queue, stats, projectId, onDelete }: QueueCardProps) {
  const router = useRouter();
  const typeConfig = QUEUE_TYPE_CONFIG[queue.type] ?? { icon: Share01Icon, label: queue.type };
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
                <HugeiconsIcon icon={typeConfig.icon} size={15} className="text-[var(--text-dim)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold text-[var(--text)] truncate">{queue.name}</h3>
                  {isPaused && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20">
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
                    <HugeiconsIcon icon={Share01Icon} size={10} />
                    {typeConfig.label}
                  </span>
                  <span>·</span>
                  <span>ID: {queue.id}</span>
                  <span>·</span>
                  <span>Created {new Date(queue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>

                {stats && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={Task01Icon} size={10} className="text-[var(--text-dim)]" />
                      <span className="text-[10px] text-[var(--text-dim)]">
                        <span className="text-[var(--text)] font-medium">{stats.pending}</span> waiting
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={Database01Icon} size={10} className="text-[var(--info)]" />
                      <span className="text-[10px] text-[var(--text-dim)]">
                        <span className="text-[var(--text)] font-medium">{stats.delivered}</span> processing
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} className="text-[var(--success)]" />
                      <span className="text-[10px] text-[var(--text-dim)]">
                        <span className="text-[var(--text)] font-medium">{stats.acknowledged}</span> completed
                      </span>
                    </div>
                    {stats.failed > 0 && (
                      <div className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={Cancel01Icon} size={10} className="text-[var(--warning)]" />
                        <span className="text-[10px] text-[var(--warning)]">
                          <span className="font-medium">{stats.failed}</span> failed
                        </span>
                      </div>
                    )}
                    {stats.deadLettered > 0 && (
                      <div className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={Cancel01Icon} size={10} className="text-[var(--danger)]" />
                        <span className="text-[10px] text-[var(--danger)]">
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
                <HugeiconsIcon icon={ChevronRightIcon} size={12} className="text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors" />
              </div>
            </div>
          </div>
        </Card>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(queue); }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete queue"
      >
        <HugeiconsIcon icon={Delete02Icon} size={13} />
      </button>
    </div>
  );
}
