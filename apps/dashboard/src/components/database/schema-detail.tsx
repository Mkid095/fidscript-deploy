'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PodcastIcon } from '@hugeicons/core-free-icons';
import { DataGrid } from './data-grid';
import type { ColumnInfo } from '@/types';

interface RowState {
  data: Record<string, unknown>[];
  total: number;
  loading: boolean;
  error?: string;
}

interface SchemaDetailProps {
  table: string | null;
  schema: { name: string; comment?: string; rowCount?: number }[];
  realtimeTables: { table: string }[];
  rowState: RowState | null;
  columnsCache: Record<string, ColumnInfo[]>;
  onRefresh: (table: string) => void;
}

export function SchemaDetail({
  table,
  schema,
  realtimeTables,
  rowState,
  columnsCache,
  onRefresh,
}: SchemaDetailProps) {
  const [activeTab, setActiveTab] = useState<'columns' | 'data'>('columns');

  if (!table) {
    return (
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-center h-full text-sm text-[var(--text-dim)]">
          <div className="text-center">
            <p>Select a table to explore its structure</p>
            <p className="text-xs mt-1">{schema.length} objects</p>
          </div>
        </div>
      </div>
    );
  }

  const tableMeta = schema.find(t => t.name === table);
  const isRealtime = !!realtimeTables.find(rt => rt.table === table);
  const cols = columnsCache[table] ?? [];

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
      {/* Table header */}
      <div className="px-4 py-3 border-b border-[var(--rail)] bg-[var(--surface)] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)] font-mono">{table}</h2>
            {tableMeta?.comment && (
              <p className="text-[10px] text-[var(--text-dim)] mt-0.5 italic">{tableMeta.comment}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isRealtime && (
              <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center gap-1">
                <HugeiconsIcon icon={PodcastIcon} size={10} />REALTIME
              </span>
            )}
            <span className="text-[10px] text-[var(--text-dim)] font-mono">
              {tableMeta?.rowCount?.toLocaleString() ?? '—'} rows
            </span>
            <button
              onClick={() => onRefresh(table)}
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
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
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
        {activeTab === 'columns' && (
          <div className="p-6 text-xs text-[var(--text-dim)]">
            <span className="text-[10px] opacity-60">
              Use the SQL Editor to query <code className="font-mono">information_schema.columns</code> for full column metadata.
            </span>
          </div>
        )}
        {activeTab === 'data' && (
          <div className="h-full">
            {rowState ? (
              <DataGrid
                table={table}
                state={rowState}
                onRefresh={() => onRefresh(table)}
                isRealtime={isRealtime}
                columns={cols}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-xs text-[var(--text-dim)]">
                Loading {table}&hellip;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
