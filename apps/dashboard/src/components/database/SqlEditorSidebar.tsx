'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { TableIcon, BoltIcon, Database02Icon, FolderOpenIcon } from '@hugeicons/core-free-icons';
import { SNIPPETS } from './sql-editor.types';
import { inferTabName } from './sql-editor.utils';
import { SqlEditorSavedQueries } from './SqlEditorSavedQueries';
import { SqlEditorHistory } from './SqlEditorHistory';
import { SqlEditorSchemaTree } from './SqlEditorSchemaTree';

interface SchemaTable {
  schema: string;
  name: string;
  rowCount?: number;
}

interface SqlEditorSidebarProps {
  sidebarTab: 'tables' | 'snippets';
  setSidebarTab: (tab: 'tables' | 'snippets') => void;
  tableSearch: string;
  setTableSearch: (s: string) => void;
  expandedSchemas: Set<string>;
  toggleSchema: (s: string) => void;
  bySchema: Record<string, SchemaTable[]>;
  filteredTables: SchemaTable[] | null;
  insertTableSQL: (tableName: string) => void;
  activeTabId: string;
  updateTab: (id: string, patch: { sql: string; dirty?: boolean; name?: string }) => void;
  addTab: (sql?: string, name?: string) => void;
}

export function SqlEditorSidebar({
  sidebarTab, setSidebarTab, tableSearch, setTableSearch,
  expandedSchemas, toggleSchema, bySchema, filteredTables,
  insertTableSQL, activeTabId, updateTab, addTab,
}: SqlEditorSidebarProps) {
  return (
    <aside className="w-60 border-r border-[var(--rail)] bg-[var(--surface)] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Sidebar tabs */}
      <div className="flex border-b border-[var(--rail)] flex-shrink-0">
        <button
          onClick={() => setSidebarTab('tables')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
            sidebarTab === 'tables' ? 'text-[var(--text)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
          }`}
        >
          <HugeiconsIcon icon={TableIcon} size={13} />Tables
        </button>
        <button
          onClick={() => setSidebarTab('snippets')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
            sidebarTab === 'snippets' ? 'text-[var(--text)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
          }`}
        >
          <HugeiconsIcon icon={BoltIcon} size={13} />Snippets
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {sidebarTab === 'tables' && (
          <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-2 flex-shrink-0">
              <div className="relative">
                <HugeiconsIcon icon={FolderOpenIcon} size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Search tables…"
                  className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded pl-7 pr-2 py-1.5 text-[11px] focus:outline-none focus:border-[var(--accent)]/50"
                />
              </div>
            </div>

            {/* Table tree */}
            {filteredTables ? (
              <div className="px-2 pb-2 space-y-0.5">
                {filteredTables.length === 0 ? (
                  <p className="text-[10px] text-[var(--text-dim)] px-2 py-1">No tables found.</p>
                ) : (
                  filteredTables.map(t => (
                    <button
                      key={`${t.schema}.${t.name}`}
                      onClick={() => insertTableSQL(t.name)}
                      className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left"
                    >
                      <HugeiconsIcon icon={Database02Icon} size={11} className="flex-shrink-0 text-[var(--text-dim)]" />
                      <span className="truncate">{t.name}</span>
                      <span className="text-[9px] text-[var(--text-dim)] ml-auto opacity-60">{t.rowCount?.toLocaleString() ?? '—'}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <SqlEditorSchemaTree
                bySchema={bySchema}
                expandedSchemas={expandedSchemas}
                toggleSchema={toggleSchema}
                insertTableSQL={insertTableSQL}
              />
            )}
          </div>
        )}

        {sidebarTab === 'snippets' && (
          <div className="p-2 space-y-0.5">
            <p className="text-[10px] text-[var(--text-dim)] px-1 mb-2">Click to insert into editor.</p>
            {SNIPPETS.map((s, i) => (
              <button
                key={i}
                onClick={() => updateTab(activeTabId, { sql: s.sql, dirty: true, name: inferTabName(s.sql) })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left"
              >
                <HugeiconsIcon icon={BoltIcon} size={11} className="flex-shrink-0" />{s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <SqlEditorSavedQueries activeTabId={activeTabId} updateTab={updateTab} />
      <SqlEditorHistory addTab={addTab} />
    </aside>
  );
}
