'use client';
/* eslint-disable import/order */


import { useState } from 'react';
import { useDatabase } from '../../database-context';
import { formatBytes, formatRelativeTime } from '@/lib/format';
import { DataGrid } from '@/components/database/data-grid';

export default function ExplorerPage() {
  const { schema, selectedTable, selectTable, rowsByTable, fetchRows, loadingSchema, realtimeTables } = useDatabase();
  const [schemaName, setSchemaName] = useState('public');

  // Group tables by schema
  const bySchema = schema.reduce<Record<string, typeof schema>>((acc, t) => {
    (acc[t.schema] ||= []).push(t);
    return acc;
  }, {});

  const tables = bySchema[schemaName] || [];
  const isRealtime = (table: string) => realtimeTables.some(rt => rt.table === table);
  const rowState = selectedTable ? rowsByTable[selectedTable] : null;

  return (
    <div className="flex h-full">
      {/* Schema + table tree */}
      <aside className="w-64 border-r border-[var(--rail)] bg-[var(--surface)] flex-shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-[var(--rail)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">Schemas</p>
        </div>
        {Object.keys(bySchema).length === 0 ? (
          <p className="text-xs text-[var(--text-dim)] p-3">{loadingSchema ? 'Loading…' : 'No tables'}</p>
        ) : (
          Object.entries(bySchema).map(([sname, tables]) => (
            <div key={sname}>
              <button
                onClick={() => { setSchemaName(sname); selectTable(null); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                  schemaName === sname ? 'text-[var(--text)] bg-[var(--rail)]/40' : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
                }`}
              >
                {sname} <span className="text-[var(--text-dim)] ml-1">({tables.length})</span>
              </button>
              {schemaName === sname && (
                <div className="pb-2">
                  {tables.map(t => (
                    <button
                      key={`${t.schema}.${t.name}`}
                      onClick={() => { selectTable(t.name); fetchRows(t.name); }}
                      className={`w-full text-left px-4 py-1 text-xs flex items-center gap-2 group ${
                        selectedTable === t.name
                          ? 'text-[var(--text)] bg-[var(--accent)]/10 border-l-2 border-[var(--danger)]'
                          : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/40'
                      }`}
                    >
                      <span className="text-[10px] text-[var(--text-dim)] font-mono uppercase">{t.type === 'view' ? 'V' : 'T'}</span>
                      <span className="flex-1 truncate">{t.name}</span>
                      {isRealtime(t.name) && (
                        <span className="text-[8px] px-1 rounded bg-[var(--success)]/10 text-[var(--success)] font-bold">RT</span>
                      )}
                      {t.rowCount != null && (
                        <span className="text-[10px] text-[var(--text-dim)] font-mono">~{t.rowCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </aside>

      {/* Table detail / data grid */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selectedTable ? (
          <div className="p-6">
            <p className="text-sm text-[var(--text-dim)]">Select a table from the left to view its data.</p>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              {schema.length} tables across {Object.keys(bySchema).length} schema(s)
            </p>
          </div>
        ) : rowState ? (
          <DataGrid
            table={selectedTable}
            state={rowState}
            onRefresh={() => fetchRows(selectedTable)}
            isRealtime={isRealtime(selectedTable)}
          />
        ) : (
          <div className="p-6 text-xs text-[var(--text-dim)]">Loading {selectedTable}…</div>
        )}
      </div>
    </div>
  );
}
