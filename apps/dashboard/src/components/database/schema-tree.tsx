'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Database02Icon, ViewIcon, PodcastIcon } from '@hugeicons/core-free-icons';

interface SchemaTable {
  schema: string;
  name: string;
  type: string;
  comment?: string;
  rowCount?: number;
}

interface SchemaTreeProps {
  schema: SchemaTable[];
  schemaName: string;
  selectedTable: string | null;
  loadingSchema: boolean;
  realtimeTables: { table: string }[];
  onSchemaSelect: (schema: string) => void;
  onTableSelect: (table: string | null) => void;
  onTableFetch: (table: string) => void;
}

export function SchemaTree({
  schema,
  schemaName,
  selectedTable,
  loadingSchema,
  realtimeTables,
  onSchemaSelect,
  onTableSelect,
  onTableFetch,
}: SchemaTreeProps) {
  const bySchema = schema.reduce<Record<string, SchemaTable[]>>((acc, t) => {
    (acc[t.schema] ||= []).push(t);
    return acc;
  }, {});

  const isRealtime = (table: string) => realtimeTables.some(rt => rt.table === table);

  return (
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
                  onClick={() => { onSchemaSelect(sname); onTableSelect(null); }}
                  className={`w-full text-left px-2 py-1 text-xs rounded font-semibold uppercase tracking-wider ${
                    schemaName === sname
                      ? 'text-[var(--text)] bg-[var(--rail)]/50'
                      : 'text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--rail)]/20'
                  }`}
                >
                  {sname}
                  <span className="ml-1 text-[10px] opacity-60">({tbls.length})</span>
                </button>

                {schemaName === sname && (
                  <div className="ml-2 mt-0.5 space-y-0.5 pb-1">
                    {tbls.map(t => (
                      <button
                        key={`${t.schema}.${t.name}`}
                        onClick={() => { onTableSelect(t.name); onTableFetch(t.name); }}
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
          {schema.length} objects &middot; {Object.keys(bySchema).length} schema(s)
        </p>
      </div>
    </aside>
  );
}
