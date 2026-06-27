'use client';
/* eslint-disable import/order */


import { useDatabase } from '../../database-context';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';

export default function RealtimePage() {
  const { schema, realtimeTables, enableRealtime, disableRealtime, refreshRealtimeTables, databaseId } = useDatabase();
  const { getSdk } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);

  const startWatching = async (table: string) => {
    if (!databaseId) return;
    setActiveTable(table);
    setEvents([]);
    const sdk = getSdk();
    const sub = await sdk.database(databaseId).from(table).subscribe((e) => {
      setEvents(prev => [{ ts: new Date().toISOString(), ...e }, ...prev].slice(0, 100));
    });
    // Store the unsub for later
    (window as any).__rtUnsub = sub;
  };

  const stopWatching = () => {
    const sub = (window as any).__rtUnsub;
    if (sub) sub.unsubscribe();
    setActiveTable(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">Realtime</h1>
        <p className="text-xs text-[var(--text-dim)] mt-1">
          Subscribe to table changes via LISTEN/NOTIFY. Triggers are auto-installed on first subscribe and removed after 30min idle.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold">Active subscriptions</p>
          <button onClick={refreshRealtimeTables} className="text-[10px] text-[var(--accent)] hover:underline">Refresh</button>
        </div>
        {realtimeTables.length === 0 ? (
          <p className="text-xs text-[var(--text-dim)]">No active subscriptions.</p>
        ) : (
          <ul className="space-y-1">
            {realtimeTables.map(rt => (
              <li key={`${rt.schema}.${rt.table}`} className="rounded border border-[var(--success)]/20 bg-[var(--success)]/5 p-2 flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--success)]">
                  {rt.schema}.{rt.table} <span className="text-[var(--text-dim)] text-[10px]">({rt.subscribers})</span>
                </span>
                <button onClick={() => disableRealtime(rt.table)} className="text-[10px] text-[var(--danger)] hover:underline">
                  Disable
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-2">Tables ({schema.length})</p>
        {activeTable ? (
          <div className="rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text)] font-mono">Watching <strong>{activeTable}</strong> — events: {events.length}</p>
              <button onClick={stopWatching} className="text-[10px] text-[var(--danger)] hover:underline">Stop</button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {events.length === 0 ? (
                <p className="text-[10px] text-[var(--text-dim)] italic">No events yet. Insert/update/delete a row to see it appear here.</p>
              ) : events.map((e, i) => (
                <div key={i} className="text-[10px] font-mono text-[var(--text-dim)] border-b border-[var(--rail)]/40 pb-1">
                  <span className="text-[var(--text-dim)]">{new Date(e.ts).toLocaleTimeString()}</span>{' '}
                  <span className="text-[var(--success)] font-bold">{e.operation}</span>{' '}
                  <span className="text-[var(--text-dim)]">→</span>{' '}
                  <span className="text-[var(--text-muted)]">id={e.new?.id ?? e.old?.id}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-96 overflow-y-auto">
            {schema.map(t => (
              <button
                key={`${t.schema}.${t.name}`}
                onClick={() => startWatching(t.name)}
                className="text-left text-[11px] font-mono text-[var(--text-muted)] px-2 py-1.5 rounded border border-[var(--rail)] hover:border-[var(--accent)]/30 hover:bg-[var(--rail)]/30"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
