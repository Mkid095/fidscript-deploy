'use client';

import { useActivityRealtime } from './activity-realtime-hook';
import { IconForType } from './activity-icons';
import { formatTime } from './activity-types';
import type { Project } from '@/types';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshDotIcon } from '@hugeicons/core-free-icons';
import { Spinner, EmptyState } from '@fidscript/ui';

interface Props { project: Project }

export function ActivityFeed({ project }: Props) {
  const { events, loading, error, connected, loadInitial } = useActivityRealtime(project.id);

  if (loading) return <div className="py-8 text-center"><Spinner size="md" /></div>;
  if (error) return <p className="text-[var(--danger)] text-sm">{error}</p>;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className="text-xs text-[var(--text-muted)]">{connected ? 'Live' : 'Polling'}</span>
        </div>
        <button
          onClick={loadInitial}
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors"
        >
          <HugeiconsIcon icon={RefreshDotIcon} size={12} color="currentColor" />
          Refresh
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Project events will appear here as they happen."
        />
      ) : (
        <div className="flex flex-col">
          {events.map(event => (
            <div
              key={event.id}
              className="flex items-start gap-3 py-3 border-b border-[var(--rail)]/50 last:border-0"
            >
              <div className={`mt-0.5 flex-shrink-0 ${event.iconColor}`}>
                <IconForType type={event.iconType} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-muted)] leading-snug">{event.description}</p>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">{event.actorLabel}</p>
              </div>
              <span className="text-xs text-[var(--text-dim)] flex-shrink-0 mt-0.5">
                {formatTime(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
