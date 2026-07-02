'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { HugeiconsIcon } from '@hugeicons/react';
import { Database02Icon, ViewIcon, PodcastIcon } from '@hugeicons/core-free-icons';
import { DataGrid } from './data-grid';

export function SchemaExplorer() {
  const { schema, selectedTable, selectTable, rowsByTable, fetchRows, loadingSchema, realtimeTables, columnsCache, fetchColumns } = useDatabase();
  const [schemaName, setSchemaName] = useState('public');
  const [activeDetailTab, setActiveDetailTab] = useState<'columns' | 'data'>('columns');

  // Load columns when a table is selected
  useEffect(() => {
    if (selectedTable) {
      fetchColumns(selectedTable);
    }
  }, [selectedTable, fetchColumns]);

  // Group tables by schema
  const bySchema = schema.reduce<Record<string, typeof schema>>((acc, t) => {
    (acc[t.schema] ||= []).push(t);
    return acc;
  }, {});

  const tables = bySchema[schemaName] || [];
  const isRealtime = (table: string) => realtimeTables.some(rt => rt.table === table);
  const rowState = selectedTable ? rowsByTable[selectedTable] : null;

  return (
    <div className="flex h-full min-h-0">
      {/* Left: schema + table tree */}
      <aside className="w-56 border-r border-[var(--rail)] bg-[var(--surface)] flex-shrink-0 flex flex-col overflow-y-auto">
        {/* Schema selector */}
        <div className="p-3 border-b border-[var(--rail)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-2">Schemas</p>
          {Object.keys(bySchema).length === 0 ? (
            <p className="text-[10px] text-[var(--text-dim)]">{loadingSchema ? 'Loading…' : 'No tables'}</p>
          ) : (
            <div className="space-y-0.5">
              {Object.entries(bySchema).map(([sname, tbls]) => (
                <div key={sname}>
                  <button
                    onClick={() => { setSchemaName(sname); selectTable(null); }}
                    className={`w-full text-left px-2 py-1 text-xs rounded font-semibold uppercase tracking-wider ${
                      schemaName === sname
                        ? 'text-[var(--text)] bg-[var(--rail)]/50'
                        : 'text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--rail)]/20'
                    }`}
                  >
                    {sname}
                    <span className="ml-1 text-[10px] opacity-60">({tbls.length})</span>
                  </button>

                  {/* Tables under this schema */}
                  {schemaName === sname && (
                    <div className="ml-2 mt-0.5 space-y-0.5 pb-1">
                      {tbls.map(t => (
                        <button
                          key={`${t.schema}.${t.name}`}
                          onClick={() => { selectTable(t.name); fetchRows(t.name); fetchColumns(t.name); }}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 group ${
                            selectedTable === t.name
                              ? 'text-[var(--text)] bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]'
                              : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30'
                          }`}
                        >
                          <HugeiconsIcon
                            icon={t.type === 'view' || t.type === 'materialized_view' ? ViewIcon : Database02Icon}
                            size={13}
                            className="flex-shrink-0 text-[var(--text-dim)]"
                          />
                          <span className="flex-1 truncate text-left text-xs">{t.name}</span>
                          {isRealtime(t.name) && (
                            <HugeiconsIcon icon={PodcastIcon} size={11} className="flex-shrink-0 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats footer */}
        <div className="mt-auto p-3 border-t border-[var(--rail)]">
          <p className="text-[10px] text-[var(--text-dim)]">
            {schema.length} objects · {Object.keys(bySchema).length} schema(s)
          </p>
        </div>
      </aside>

      {/* Right: table detail */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {!selectedTable ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--text-dim)]">
            <div className="text-center">
              <p>Select a table to explore its structure</p>
              <p className="text-xs mt-1">{schema.length} objects in {Object.keys(bySchema).length} schema(s)</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="px-4 py-3 border-b border-[var(--rail)] bg-[var(--surface)] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)] font-mono">{selectedTable}</h2>
                  {schema.find(t => t.name === selectedTable)?.comment && (
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5 italic">
                      {schema.find(t => t.name === selectedTable)?.comment}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {realtimeTables.find(rt => rt.table === selectedTable) && (
                    <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center gap-1">
                      <HugeiconsIcon icon={PodcastIcon} size={10} />REALTIME
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--text-dim)] font-mono">
                    {schema.find(t => t.name === selectedTable)?.rowCount?.toLocaleString() ?? '—'} rows
                  </span>
                  <button
                    onClick={() => fetchRows(selectedTable)}
                    className="text-[10px] px-2 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="border-b border-[var(--rail)] bg-[var(--surface)] flex-shrink-0">
              <div className="flex px-2">
                {(['columns', 'data'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveDetailTab(tab)}
                    className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                      activeDetailTab === tab
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'data' && <span className="ml-1 opacity-60">({rowState ? String(rowState.total) : '?'})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {activeDetailTab === 'columns' && (
                <div className="p-6 text-xs text-[var(--text-dim)]">
                  Column details are shown in the Explorer tab when using mock mode.
                  <br />
                  <span className="text-[10px] opacity-60 mt-2 block">
                    In production, use the SQL Editor to query <code className="font-mono">information_schema.columns</code> for full column metadata.
                  </span>
                </div>
              )}
              {activeDetailTab === 'data' && (
                <div className="h-full">
                  {rowState ? (
                    <DataGrid
                      table={selectedTable}
                      state={rowState}
                      onRefresh={() => fetchRows(selectedTable)}
                      isRealtime={true}
                      columns={columnsCache[selectedTable ?? ''] ?? []}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-xs text-[var(--text-dim)]">
                      Loading {selectedTable}…
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
