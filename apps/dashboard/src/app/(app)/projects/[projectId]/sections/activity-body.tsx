'use client';

/**
 * ActivityBody — presentational only.
 *
 * Composes the connection status pill + reload button, the activity rows, and
 * the empty/loading/error states. Receives the events and connection state via
 * the props fed by the parent (which uses the useActivityFeed hook).
 */
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshDotIcon } from '@hugeicons/core-free-icons';
import { Spinner, EmptyState } from '@fidscript/ui';

import { type ActivityEvent } from './activity-utils';
import { ActivityRow } from './activity-row';

export interface ActivityBodyProps {
  events: ActivityEvent[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  onReload: () => void;
}

export function ActivityBody({ events, loading, error, connected, onReload }: ActivityBodyProps) {
  if (loading) {
    return (
      <div className="py-8 text-center">
        <Spinner size="md" />
      </div>
    );
  }
  if (error) {
    return <p className="text-[var(--danger)] text-sm">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className="text-xs text-[var(--text-muted)]">{connected ? 'Live' : 'Polling'}</span>
        </div>
        <button
          onClick={onReload}
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
            <ActivityRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
