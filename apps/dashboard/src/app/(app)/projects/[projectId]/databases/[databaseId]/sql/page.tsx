'use client';
/* eslint-disable import/order */


import { useState } from 'react';
import { useDatabase } from '../../database-context';
import { formatDuration } from '@/lib/format';

const STARTER_QUERIES = [
  'SELECT current_database(), current_user, version();',
  'SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;',
  'SELECT pg_size_pretty(sum(pg_database_size(oid))) FROM pg_database;',
];

export default function SqlEditor() {
  const { runQuery, queryResult, queryRunning } = useDatabase();
  const [sql, setSql] = useState(STARTER_QUERIES[0]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--rail)] bg-[var(--surface)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">SQL Editor</h3>
        <div className="flex gap-2">
          {STARTER_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => setSql(q)}
              className="text-[10px] px-2 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]"
            >
              Example {i + 1}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={sql}
        onChange={e => setSql(e.target.value)}
        spellCheck={false}
        className="w-full h-48 bg-[var(--surface-2)] border-b border-[var(--rail)] text-[var(--text)] font-mono text-xs p-3 resize-none focus:outline-none focus:border-[var(--accent)]/30"
        placeholder="SELECT * FROM users LIMIT 10;"
      />
      <div className="p-3 border-b border-[var(--rail)] bg-[var(--surface)] flex items-center gap-2">
        <button
          onClick={() => runQuery(sql)}
          disabled={queryRunning || !sql.trim()}
          className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-50"
        >
          {queryRunning ? 'Running…' : 'Run'}
        </button>
        <span className="text-[10px] text-[var(--text-dim)] ml-auto">
          Queries are validated by SafeQueryExecutor. DROP DATABASE / ALTER SYSTEM / COPY PROGRAM / CREATE ROLE are blocked.
        </span>
      </div>
      {queryResult && (
        <div className="flex-1 overflow-auto bg-[var(--surface-2)]">
          <div className="p-2 border-b border-[var(--rail)] bg-[var(--surface)] flex items-center gap-3 text-[10px] text-[var(--text-dim)]">
            <span>Rows: <strong className="text-[var(--text-muted)] font-mono">{queryResult.rowCount.toLocaleString()}</strong></span>
            <span>Time: <strong className="text-[var(--text-muted)] font-mono">{formatDuration(queryResult.executionTimeMs)}</strong></span>
            {queryResult.columns && queryResult.columns[0]?.startsWith('Error:') && (
              <span className="text-[var(--danger)] font-mono">{queryResult.columns[0]}</span>
            )}
          </div>
          {queryResult.rows.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface)] sticky top-0">
                <tr className="border-b border-[var(--rail)]">
                  {queryResult.columns?.map(c => (
                    <th key={c} className="text-left px-3 py-2 font-mono font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[10px]">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.rows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--rail)]/40">
                    {queryResult.columns?.map(c => (
                      <td key={c} className="px-3 py-1.5 font-mono text-[var(--text-muted)] max-w-md truncate">
                        {row[c] === null ? <span className="text-[var(--text-dim)]">NULL</span>
                          : typeof row[c] === 'object' ? JSON.stringify(row[c])
                          : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-[var(--text-dim)] p-4">Query returned 0 rows.</p>
          )}
        </div>
      )}
    </div>
  );
}
