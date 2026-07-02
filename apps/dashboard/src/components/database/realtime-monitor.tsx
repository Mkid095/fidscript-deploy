'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { HugeiconsIcon } from '@hugeicons/react';
import { PodcastIcon, BoltIcon } from '@hugeicons/core-free-icons';

export function RealtimeMonitor() {
  const { getSdk } = useAuth();
  const { databaseId, realtimeTables, refreshRealtimeTables } = useDatabase();
  const [subscribedTables, setSubscribedTables] = useState<Set<string>>(new Set());
  const [realtimeEvents, setRealtimeEvents] = useState<Array<{
    table: string; eventType: string; old: Record<string, unknown>; new: Record<string, unknown>; timestamp: string
  }>>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unsubsRef = useRef<Record<string, () => void>>({});

  // Subscribe/unsubscribe a table
  const toggleTable = useCallback((table: string) => {
    if (!databaseId) return;
    if (subscribedTables.has(table)) {
      unsubsRef.current[table]?.();
      delete unsubsRef.current[table];
      setSubscribedTables(prev => { const n = new Set(prev); n.delete(table); return n; });
    } else {
      const sdk = getSdk();
      sdk.database(databaseId).from(table).subscribe((event: unknown) => {
        const e = event as { eventType: string; old: unknown; new: unknown; timestamp: string };
        setRealtimeEvents(prev => [
          { table, eventType: e.eventType, old: (e.old ?? {}) as Record<string, unknown>, new: (e.new ?? {}) as Record<string, unknown>, timestamp: e.timestamp ?? new Date().toISOString() },
          ...prev,
        ].slice(0, 200));
      }).then(sub => { unsubsRef.current[table] = () => { sub.unsubscribe(); }; });
      setSubscribedTables(prev => new Set(prev).add(table));
    }
  }, [databaseId, getSdk, subscribedTables]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [realtimeEvents, autoScroll]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => { Object.values(unsubsRef.current).forEach(fn => fn()); };
  }, []);

  const eventColor: Record<string, string> = {
    INSERT: 'text-emerald-400',
    UPDATE: 'text-blue-400',
    DELETE: 'text-rose-400',
  };
  const eventBg: Record<string, string> = {
    INSERT: 'bg-emerald-500/10',
    UPDATE: 'bg-blue-500/10',
    DELETE: 'bg-rose-500/10',
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Left: table subscription list */}
      <aside className="w-56 border-r border-[var(--rail)] bg-[var(--surface)] flex-shrink-0 flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-[var(--rail)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">Realtime Tables</p>
            <button onClick={refreshRealtimeTables} className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]" title="Refresh">↺</button>
          </div>
          <p className="text-[10px] text-[var(--text-dim)]">Subscribe to tables to watch live changes.</p>
        </div>

        {realtimeTables.length === 0 ? (
          <div className="p-3 text-xs text-[var(--text-dim)]">No realtime-enabled tables found.</div>
        ) : (
          <div className="p-2 space-y-0.5">
            {realtimeTables.map(rt => (
              <button
                key={`${rt.schema}.${rt.table}`}
                onClick={() => toggleTable(rt.table)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                  subscribedTables.has(rt.table)
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${subscribedTables.has(rt.table) ? 'bg-emerald-400' : 'bg-[var(--rail)]'}`} />
                <span className="flex-1 truncate font-mono">{rt.table}</span>
                <span className="text-[10px] opacity-60">{rt.subscribers ?? 1}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto p-3 border-t border-[var(--rail)]">
          <p className="text-[10px] text-[var(--text-dim)]">{subscribedTables.size} table(s) subscribed</p>
        </div>
      </aside>

      {/* Right: event stream */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="px-4 py-2 border-b border-[var(--rail)] bg-[var(--surface)] flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-semibold text-[var(--text)]">Live Events</span>
          {subscribedTables.size > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold animate-pulse flex items-center gap-1">
              <HugeiconsIcon icon={PodcastIcon} size={10} className="animate-pulse" />LIVE</span>
          )}
          <div className="flex-1" />
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="accent-[var(--accent)]" />
            Auto-scroll
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {realtimeEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-[var(--text-dim)]">
              <HugeiconsIcon icon={BoltIcon} size={32} className="opacity-20 mb-2" />
              <p>No events yet. Subscribe to tables on the left.</p>
              <p className="text-[10px] mt-1 opacity-60">Events appear here in real time as rows are inserted, updated, or deleted.</p>
            </div>
          ) : (
            realtimeEvents.map((event, i) => (
              <div key={i} className={`flex flex-col gap-1 px-3 py-2 rounded border border-[var(--rail)] ${eventBg[event.eventType] ?? ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${eventBg[event.eventType] ?? ''} ${eventColor[event.eventType] ?? ''}`}>
                    {event.eventType}
                  </span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">{event.table}</span>
                  <span className="flex-1" />
                  <span className="text-[10px] text-[var(--text-dim)] font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                {Object.keys(event.new).length > 0 ? (
                  <pre className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--surface)]/50 rounded p-1.5 overflow-x-auto">{`new: ${JSON.stringify(event.new)}`}</pre>
                ) : null}
                {Object.keys(event.old).length > 0 ? (
                  <pre className="text-[10px] font-mono text-[var(--text-dim)] bg-[var(--surface)]/50 rounded p-1.5 overflow-x-auto">{`old: ${JSON.stringify(event.old)}`}</pre>
                ) : null}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
