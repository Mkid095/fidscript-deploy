'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDatabase, type SavedQuery } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { formatDuration } from '@/lib/format';
import { useResizable } from '@/hooks/useResizable';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon, PlayIcon, Download01Icon,
  TableIcon, Bookmark02Icon, HistoryIcon, BoltIcon,
  Database02Icon, ChevronDownIcon, ChevronRightIcon,
  Cancel01Icon, CheckmarkCircle03Icon, AlertCircleIcon,
  File01Icon, FolderOpenIcon,
} from '@hugeicons/core-free-icons';
import type { QueryResult } from '@/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface SqlTab {
  id: string;
  name: string;
  sql: string;
  dirty: boolean;
  status: 'idle' | 'running' | 'success' | 'error';
  result: QueryResult | null;
  executionTimeMs: number;
}

type ResultPaneTab = 'results' | 'messages' | 'logs';

// ─── Snippets ─────────────────────────────────────────────────────────────────

const SNIPPETS: { label: string; sql: string }[] = [
  {
    label: 'SELECT rows',
    sql: 'SELECT * FROM \nLIMIT 100;',
  },
  {
    label: 'INSERT row',
    sql: 'INSERT INTO  ()\nVALUES ();',
  },
  {
    label: 'UPDATE rows',
    sql: 'UPDATE \nSET  = \nWHERE ;',
  },
  {
    label: 'DELETE rows',
    sql: 'DELETE FROM \nWHERE ;',
  },
  {
    label: 'CREATE TABLE',
    sql: 'CREATE TABLE (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n);',
  },
  {
    label: 'CREATE INDEX',
    sql: 'CREATE INDEX CONCURRENTLY idx_ ON ();',
  },
  {
    label: 'ALTER TABLE',
    sql: 'ALTER TABLE  ADD COLUMN  ;',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferTabName(sql: string): string {
  const trimmed = sql.trim();
  if (!trimmed) return 'Untitled';
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('SELECT')) {
    const match = trimmed.match(/FROM\s+(\w+)/i);
    if (match) return `${match[1]} query`;
    return 'SELECT query';
  }
  if (upper.startsWith('INSERT')) return 'INSERT';
  if (upper.startsWith('UPDATE')) return 'UPDATE';
  if (upper.startsWith('DELETE')) return 'DELETE';
  if (upper.startsWith('CREATE TABLE')) return 'CREATE TABLE';
  if (upper.startsWith('CREATE INDEX')) return 'CREATE INDEX';
  if (upper.startsWith('CREATE FUNCTION')) return 'CREATE FUNCTION';
  if (upper.startsWith('ALTER')) return 'ALTER';
  if (upper.startsWith('DROP')) return 'DROP';
  if (upper.startsWith('EXPLAIN')) return 'EXPLAIN';
  if (upper.startsWith('SET')) return 'SET';
  return trimmed.split('\n')[0].slice(0, 40);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(columns: string[], rows: Record<string, unknown>[]) {
  const header = columns.map(c => `"${c}"`).join(',');
  const lines = rows.map(row =>
    columns.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  );
  downloadBlob([header, ...lines].join('\n'), 'query_result.csv', 'text/csv');
}

function exportJSON(rows: Record<string, unknown>[]) {
  downloadBlob(JSON.stringify(rows, null, 2), 'query_result.json', 'application/json');
}

// ─── SqlEditorV2 ─────────────────────────────────────────────────────────────

export function SqlEditorV2() {
  const {
    schema, queryResult, runQuery, queryRunning,
    queryHistory, savedQueries, saveQuery, deleteSavedQuery,
    queryLogs, clearLogs,
  } = useDatabase();

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const [tabs, setTabs] = useState<SqlTab[]>([
    { id: 'tab-1', name: 'Query 1', sql: '-- Write your SQL here\nSELECT 1;', dirty: false, status: 'idle', result: null, executionTimeMs: 0 },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  const updateTab = useCallback((id: string, patch: Partial<SqlTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const addTab = useCallback((sql = '', name?: string) => {
    setTabs(prev => {
      // Deduplicate: if a tab with the same SQL already exists, switch to it
      const existing = prev.find(t => t.sql === sql);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const id = `tab-${Date.now()}`;
      const tabName = name ?? `Query ${prev.length + 1}`;
      setActiveTabId(id);
      return [...prev, { id, name: tabName, sql, dirty: false, status: 'idle', result: null, executionTimeMs: 0 }];
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) {
        const newTab: SqlTab = { id: `tab-${Date.now()}`, name: 'Query 1', sql: '-- Write your SQL here\nSELECT 1;', dirty: false, status: 'idle', result: null, executionTimeMs: 0 };
        setActiveTabId(newTab.id);
        return [newTab];
      }
      if (id === activeTabId) {
        setActiveTabId(next[Math.max(0, idx - 1)].id);
      }
      return next;
    });
  }, [activeTabId]);

  // ── Sidebar ──────────────────────────────────────────────────────────────

  const [sidebarTab, setSidebarTab] = useState<'tables' | 'snippets'>('tables');
  const [tableSearch, setTableSearch] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public']));
  const [snippetOpen, setSnippetOpen] = useState(false);

  const toggleSchema = (s: string) => {
    setExpandedSchemas(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  };

  const bySchema = useMemo(() =>
    schema.reduce<Record<string, typeof schema>>((acc, t) => {
      (acc[t.schema] ||= []).push(t);
      return acc;
    }, {}),
    [schema]
  );

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return null;
    const q = tableSearch.toLowerCase();
    return schema.filter(t => t.name.toLowerCase().includes(q));
  }, [schema, tableSearch]);

  const insertTableSQL = (tableName: string) => {
    const sql = `SELECT * FROM ${tableName}\nLIMIT 100;`;
    updateTab(activeTabId, { sql, dirty: true, name: inferTabName(sql) });
  };

  // ── Results pane ──────────────────────────────────────────────────────────

  const [resultPaneTab, setResultPaneTab] = useState<ResultPaneTab>('results');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultPaneTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [queryLogs, resultPaneTab]);

  // ── Resizable ─────────────────────────────────────────────────────────────

  const { ratio, containerRef, handleMouseDown } = useResizable({
    initialRatio: 0.55,
    minRatio: 0.25,
    maxRatio: 0.8,
    storageKey: 'sql-editor-split',
    direction: 'vertical',
  });

  // ── Run query ─────────────────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    if (!activeTab?.sql.trim() || queryRunning) return;
    const sql = activeTab.sql.trim();
    updateTab(activeTabId, { status: 'running', result: null, executionTimeMs: 0 });
    clearLogs();

    const start = Date.now();
    try {
      const result = await runQuery(sql);
      updateTab(activeTabId, {
        status: 'success',
        result,
        executionTimeMs: Date.now() - start,
      });
      setResultPaneTab('results');
    } catch {
      updateTab(activeTabId, {
        status: 'error',
        executionTimeMs: Date.now() - start,
      });
      setResultPaneTab('messages');
    }
  }, [activeTab, activeTabId, queryRunning, runQuery, updateTab, clearLogs]);

  // ── Monaco keybindings ────────────────────────────────────────────────────

  const handleEditorMount = useCallback((editor: unknown) => {
    const monaco = editor as { addCommand: (keyCode: number, handler: () => void) => void };
    // Ctrl/Cmd + Enter → run
    monaco.addCommand(2048 | 3, () => handleRun());
    // Ctrl/Cmd + W → close tab
    monaco.addCommand(2048 | 87, () => closeTab(activeTabId));
    // Ctrl/Cmd + S → save
    monaco.addCommand(2048 | 83, () => {
      if (activeTab?.sql.trim()) {
        const name = inferTabName(activeTab.sql);
        saveQuery(name, activeTab.sql);
      }
    });
  }, [handleRun, closeTab, activeTabId, activeTab, saveQuery]);

  // ── Copy helpers ──────────────────────────────────────────────────────────

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const isError = activeTab?.result?.columns?.[0]?.startsWith('Error:') ?? false;
  const result = activeTab?.result;

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-60 border-r border-[var(--rail)] bg-[var(--surface)] flex flex-col flex-shrink-0 overflow-hidden">
        {/* Sidebar tabs */}
        <div className="flex border-b border-[var(--rail)] flex-shrink-0">
          <button
            onClick={() => setSidebarTab('tables')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
              sidebarTab === 'tables'
                ? 'text-[var(--text)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
            }`}
          >
            <HugeiconsIcon icon={TableIcon} size={13} />
            Tables
          </button>
          <button
            onClick={() => setSidebarTab('snippets')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
              sidebarTab === 'snippets'
                ? 'text-[var(--text)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
            }`}
          >
            <HugeiconsIcon icon={BoltIcon} size={13} />
            Snippets
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
                Object.entries(bySchema).map(([sname, tbls]) => (
                  <div key={sname} className="mb-1">
                    <button
                      onClick={() => toggleSchema(sname)}
                      className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text)]"
                    >
                      <HugeiconsIcon
                        icon={expandedSchemas.has(sname) ? ChevronDownIcon : ChevronRightIcon}
                        size={10}
                      />
                      {sname}
                      <span className="ml-auto opacity-60 font-normal">({tbls.length})</span>
                    </button>
                    {expandedSchemas.has(sname) && (
                      <div className="ml-2 space-y-0.5 pb-1">
                        {tbls.map(t => (
                          <button
                            key={`${t.schema}.${t.name}`}
                            onClick={() => insertTableSQL(t.name)}
                            className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left"
                          >
                            <HugeiconsIcon icon={Database02Icon} size={11} className="flex-shrink-0 text-[var(--text-dim)]" />
                            <span className="truncate">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {sidebarTab === 'snippets' && (
            <div className="p-2 space-y-0.5">
              <p className="text-[10px] text-[var(--text-dim)] px-1 mb-2">Click to insert into editor.</p>
              {SNIPPETS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    updateTab(activeTabId, {
                      sql: s.sql,
                      dirty: true,
                      name: inferTabName(s.sql),
                    });
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left"
                >
                  <HugeiconsIcon icon={BoltIcon} size={11} className="flex-shrink-0" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved queries in sidebar */}
        {savedQueries.length > 0 && (
          <div className="border-t border-[var(--rail)] flex-shrink-0 max-h-40 overflow-y-auto">
            <div className="px-2 py-1.5">
              <p className="text-[9px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1 px-1">Saved</p>
              {savedQueries.slice(0, 10).map(sq => (
                <button
                  key={sq.id}
                  onClick={() => {
                    const sql = sq.sql;
                    const name = sq.name;
                    updateTab(activeTabId, { sql, dirty: false, name });
                  }}
                  className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left truncate"
                >
                  <HugeiconsIcon icon={Bookmark02Icon} size={10} className="flex-shrink-0" />
                  <span className="truncate">{sq.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History in sidebar */}
        {queryHistory.length > 0 && (
          <div className="border-t border-[var(--rail)] flex-shrink-0 max-h-40 overflow-y-auto">
            <div className="px-2 py-1.5">
              <p className="text-[9px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1 px-1">History</p>
              {queryHistory.slice(0, 10).map(h => (
                <button
                  key={h.id}
                  onClick={() => {
                    const id = addTab(h.sql, inferTabName(h.sql));
                    void id;
                  }}
                  className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left"
                  title={h.sql}
                >
                  <HugeiconsIcon icon={HistoryIcon} size={10} className="flex-shrink-0" />
                  <span className="truncate font-mono">{h.sql.slice(0, 30)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center bg-[var(--surface)] border-b border-[var(--rail)] flex-shrink-0 overflow-x-auto">
          <div className="flex items-center min-w-0">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-r border-[var(--rail)] min-w-0 cursor-pointer ${
                  activeTabId === tab.id
                    ? 'text-[var(--text)] bg-[var(--surface-2)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/20'
                }`}
              >
                {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />}
                <span className="truncate max-w-[120px]">{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={10} />
                  </button>
                )}
                {tab.status === 'running' && (
                  <span className="w-3 h-3 border border-[var(--text-dim)]/30 border-t-[var(--text-dim)] rounded-full animate-spin flex-shrink-0" />
                )}
                {tab.status === 'success' && (
                  <HugeiconsIcon icon={CheckmarkCircle03Icon} size={11} className="text-emerald-400 flex-shrink-0" />
                )}
                {tab.status === 'error' && (
                  <HugeiconsIcon icon={AlertCircleIcon} size={11} className="text-rose-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => addTab()}
            className="flex-shrink-0 p-2 text-[var(--text-dim)] hover:text-[var(--text)]"
            title="New tab"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} />
          </button>
        </div>

        {/* Editor + Results split */}
        <div ref={containerRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Monaco Editor */}
          <div style={{ height: `${ratio * 100}%` }} className="min-h-0 flex-shrink-0">
            <MonacoEditor
              height="100%"
              language="sql"
              value={activeTab?.sql ?? ''}
              onChange={val => updateTab(activeTabId, { sql: val ?? '', dirty: true })}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'line',
                scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={handleMouseDown}
            className="h-1.5 bg-[var(--rail)] hover:bg-[var(--accent)]/50 cursor-row-resize flex items-center justify-center group flex-shrink-0 transition-colors"
          >
            <div className="w-6 h-0.5 rounded-full bg-[var(--text-dim)]/30 group-hover:bg-[var(--accent)] transition-colors" />
          </div>

          {/* Results pane */}
          <div style={{ height: `${(1 - ratio) * 100}%` }} className="min-h-0 flex flex-col flex-shrink-0 overflow-hidden">
            {/* Results tab bar */}
            <div className="flex items-center gap-0 px-2 bg-[var(--surface)] border-b border-[var(--rail)] flex-shrink-0">
              {(['results', 'messages', 'logs'] as ResultPaneTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setResultPaneTab(tab)}
                  className={`px-3 py-2 text-[11px] font-medium border-b-2 -mb-px transition-colors ${
                    resultPaneTab === tab
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'results' && result && !isError && (
                    <span className="ml-1.5 text-[9px] opacity-60">{result.rowCount.toLocaleString()} rows</span>
                  )}
                  {tab === 'logs' && queryLogs.length > 0 && (
                    <span className="ml-1 text-[9px] opacity-60">{queryLogs.length}</span>
                  )}
                </button>
              ))}
              <div className="flex-1" />
              {/* Run button + Export */}
              <button
                onClick={handleRun}
                disabled={queryRunning || !activeTab?.sql.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] text-[11px] font-medium disabled:opacity-50 mb-0.5"
              >
                {queryRunning ? (
                  <span className="w-3 h-3 border border-[var(--text)]/30 border-t-[var(--text)] rounded-full animate-spin" />
                ) : (
                  <HugeiconsIcon icon={PlayIcon} size={12} />
                )}
                Run
              </button>
              {result && !isError && (
                <div className="relative group">
                  <button className="flex items-center gap-1 px-2 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] text-[11px] mb-0.5">
                    <HugeiconsIcon icon={Download01Icon} size={12} />
                    Export
                    <HugeiconsIcon icon={ChevronDownIcon} size={10} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--rail)] rounded shadow-xl z-50 hidden group-hover:block min-w-[140px]">
                    <button
                      onClick={() => result && exportCSV(result.columns, result.rows)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-[var(--rail)]/30 text-left text-[var(--text)]"
                    >
                      <HugeiconsIcon icon={File01Icon} size={12} />
                      Export CSV
                    </button>
                    <button
                      onClick={() => result && exportJSON(result.rows)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-[var(--rail)]/30 text-left text-[var(--text)]"
                    >
                      <HugeiconsIcon icon={File01Icon} size={12} />
                      Export JSON
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Results content */}
            <div className="flex-1 min-h-0 overflow-auto">
              {/* ── Results tab ── */}
              {resultPaneTab === 'results' && (
                result && !isError ? (
                  result.rows.length > 0 ? (
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
                  ) : (
                    <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">Query returned 0 rows.</div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">
                    Run a query to see results.
                  </div>
                )
              )}

              {/* ── Messages tab ── */}
              {resultPaneTab === 'messages' && (
                <div className="p-4">
                  {isError ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-rose-400 font-semibold">
                        <HugeiconsIcon icon={AlertCircleIcon} size={14} />
                        Query failed
                      </div>
                      <pre className="text-[10px] font-mono text-rose-400/80 bg-rose-500/5 border border-rose-500/20 rounded p-3 overflow-auto">
                        {result?.columns[0]?.replace('Error: ', '') ?? 'Unknown error'}
                      </pre>
                    </div>
                  ) : result ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
                        <HugeiconsIcon icon={CheckmarkCircle03Icon} size={14} />
                        Query executed successfully.
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded border border-[var(--rail)]">
                          <span className="text-[var(--text-dim)]">Rows returned</span>
                          <span className="font-mono font-semibold text-[var(--text)] ml-auto">{result.rowCount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded border border-[var(--rail)]">
                          <span className="text-[var(--text-dim)]">Execution time</span>
                          <span className="font-mono font-semibold text-[var(--text)] ml-auto">{formatDuration(activeTab?.executionTimeMs ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">No query has been run yet.</div>
                  )}
                </div>
              )}

              {/* ── Logs tab ── */}
              {resultPaneTab === 'logs' && (
                queryLogs.length > 0 ? (
                  <div className="p-2 space-y-0.5 font-mono text-[10px]">
                    {queryLogs.map((log, i) => (
                      <div key={i} className={`px-2 py-0.5 rounded ${log.includes('ERROR') ? 'text-rose-400 bg-rose-500/5' : 'text-[var(--text-muted)]'}`}>
                        {log}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">No logs yet.</div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
