'use client';

import type { QueryResult } from '@/types';

interface SqlEditorTableProps {
  result: QueryResult;
}

export function SqlEditorTable({ result }: SqlEditorTableProps) {
  if (result.rows.length === 0) {
    return <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">Query returned 0 rows.</div>;
  }
  return (
    <table className="w-full text-[11px]">
      <thead className="bg-[var(--surface)] sticky top-0 z-10">
        <tr className="border-b border-[var(--rail)]">
          {result.columns.map(col => (
            <th key={col} className="text-left px-3 py-2 font-mono font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[9px]">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row, i) => (
          <tr key={i} className="border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20">
            {result.columns.map(col => {
              const val = row[col];
              const cellStr = val === null ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val);
              return (
                <td
                  key={col}
                  className="px-3 py-1.5 font-mono text-[var(--text-muted)] max-w-xs truncate"
                  title={cellStr}
                >
                  {val === null ? (
                    <span className="text-[var(--text-dim)] italic">NULL</span>
                  ) : typeof val === 'object' ? (
                    <span className="text-[10px] text-[var(--text-dim)]">{JSON.stringify(val)}</span>
                  ) : (
                    <span>{String(val)}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
