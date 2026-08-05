'use client';

/**
 * LiveFeed — realtime event stream hero for the Realtime page.
 *
 * Owns the WebSocket lifecycle via `useRealtimeSocket`, then delegates all
 * rendering to presentational components. This keeps the container under
 * 150 lines while socket management stays in a dedicated hook.
 */
import { useState } from 'react';
import { LiveFeedConnectionStatus } from './live-feed-connection-status';
import { LiveFeedFilterBar } from './live-feed-filter-bar';
import { LiveFeedEmptyState } from './live-feed-empty-state';
import { LiveEventRow } from './live-feed-event-row';
import { useRealtimeSocket } from './use-realtime-socket';
import type { LiveFeedStatus } from './live-feed-utils';

interface LiveFeedProps {
  projectId: string;
}

export function LiveFeed({ projectId }: LiveFeedProps) {
  const { events, status, setPausedRef, clearEvents } = useRealtimeSocket(projectId);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleTogglePaused() {
    const next = !paused;
    setPaused(next);
    setPausedRef(next);
  }

  function handleClear() {
    clearEvents();
    setFilter('all');
  }

  const filtered = filter === 'all'
    ? events
    : events.filter((e) => {
        const key = (e.type.split('.')[0] ?? '').toLowerCase();
        return key === filter;
      });

  return (
    <section className="rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] overflow-hidden">
      <LiveFeedConnectionStatus
        status={status as LiveFeedStatus}
        eventCount={events.length}
        paused={paused}
        onTogglePaused={handleTogglePaused}
        onClear={handleClear}
      />

      {events.length > 0 && (
        <LiveFeedFilterBar events={events} filter={filter} onFilterChange={setFilter} />
      )}

      <div className="relative">
        <div className="h-[440px] overflow-y-auto">
          {filtered.length === 0 ? (
            <LiveFeedEmptyState status={status as LiveFeedStatus} paused={paused} />
          ) : (
            <ul className="divide-y divide-[var(--rail)]/50 font-mono">
              {filtered.map((ev) => (
                <LiveEventRow
                  key={ev.id}
                  ev={ev}
                  expanded={expanded === ev.id}
                  onToggle={() => setExpanded(expanded === ev.id ? null : ev.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
