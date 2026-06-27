'use client';

import { useEffect, useState } from 'react';

interface DataGridProps {
  table: string;
  state: { data: any[]; total: number; loading: boolean; error?: string };
  onRefresh: () => void;
  isRealtime: boolean;
}

/**
 * DataGrid — the table data viewer.
 * Shows rows with pagination, refresh button, realtime indicator.
 */
export function DataGrid({ table, state, onRefresh, isRealtime }: DataGridProps) {
  const [page, setPage] = useState(1);
  const limit = 50;
  const totalPages = Math.max(1, Math.ceil(state.total / limit));

  useEffect(() => { setPage(1); }, [table]);

  if (state.loading && state.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-[var(--text-dim)]">
        Loading rows…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6">
        <div className="rounded border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4">
          <p className="text-sm font-semibold text-[var(--danger)]">Error</p>
          <p className="text-xs text-[var(--accent)]/80 mt-1 font-mono">{state.error}</p>
          <button onClick={onRefresh} className="text-xs text-[var(--accent)] mt-3 hover:underline">
            Retry →
          </button>
        </div>
      </div>
    );
  }

  if (state.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-xs text-[var(--text-dim)]">
        <p>Table <code className="text-[var(--text-muted)] font-mono">{table}</code> is empty.</p>
        <p className="text-[10px] text-[var(--text-dim)] mt-1">Insert rows via the SQL Editor or SDK.</p>
      </div>
    );
  }

  const columns = Object.keys(state.data[0] || {});

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-[var(--rail)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">{table}</h3>
          {isRealtime && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] font-mono font-bold">
              LIVE
            </span>
          )}
          <span className="text-[10px] text-[var(--text-dim)] font-mono">
            {state.total.toLocaleString()} rows
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={state.loading}
            className="text-xs px-2.5 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--rail-light)] disabled:opacity-50"
          >
            {state.loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-[var(--surface)] sticky top-0 z-10">
            <tr className="border-b border-[var(--rail)]">
              {columns.map(c => (
                <th key={c} className="text-left px-3 py-2 font-mono font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[10px]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.data.map((row, i) => (
              <tr key={i} className="border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20">
                {columns.map(c => (
                  <td key={c} className="px-3 py-1.5 font-mono text-[var(--text-muted)] align-top max-w-md truncate" title={String(row[c] ?? 'NULL')}>
                    {row[c] === null
                      ? <span className="text-[var(--text-dim)]">NULL</span>
                      : typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-3 border-t border-[var(--rail)] bg-[var(--surface)] text-xs text-[var(--text-dim)]">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); /* fetch */ }}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-[var(--rail)] disabled:opacity-50"
          >← Prev</button>
          <button
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); /* fetch */ }}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-[var(--rail)] disabled:opacity-50"
          >Next →</button>
        </div>
      </div>
    </div>
  );
}
