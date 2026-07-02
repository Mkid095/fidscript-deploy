'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDatabase, type SavedQuery } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { formatDuration } from '@/lib/format';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete03Icon } from '@hugeicons/core-free-icons';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const EXAMPLE_QUERIES = [
  { label: 'Server version', sql: 'SELECT current_database(), current_user, version();' },
  { label: 'Table sizes', sql: 'SELECT schemaname, tablename,\n       pg_size_pretty(pg_total_relation_size(schemaname||\'.\'||tablename)) AS total_size,\n       pg_size_pretty(pg_relation_size(schemaname||\'.\'||tablename)) AS table_size\nFROM pg_stat_user_tables\nORDER BY pg_total_relation_size(schemaname||\'.\'||tablename) DESC LIMIT 20;' },
  { label: 'Active connections', sql: 'SELECT datname, numbackends, xact_commit, xact_rollback,\n       blks_read, blks_hit, stats_reset\nFROM pg_stat_database\nWHERE datname IS NOT NULL\nORDER BY numbackends DESC;' },
  { label: 'Long running queries', sql: "SELECT pid, usename, application_name, client_addr,\n       now() - query_start AS duration, state, query\nFROM pg_stat_activity\nWHERE state != 'idle' AND query_start < now() - interval '5 minutes'\nORDER BY duration DESC LIMIT 20;" },
  { label: 'Index hit rate', sql: 'SELECT relname,\n       CASE WHEN idx_scan = 0 THEN 0\n            ELSE round(100.0 * idx_tup_fetch / idx_scan, 2)\n       END AS index_hit_pct,\n       idx_scan, idx_tup_fetch, seq_scan, seq_tup_fetch\nFROM pg_stat_user_tables\nORDER BY idx_scan ASC LIMIT 30;' },
];

interface SqlEditorProps {
  className?: string;
}

export function SqlEditor({ className }: SqlEditorProps) {
  const { queryResult, runQuery, queryRunning, queryHistory, clearHistory, savedQueries, saveQuery, deleteSavedQuery } = useDatabase();
  const [sql, setSql] = useState('');
  const [editorHeight, setEditorHeight] = useState(240);
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'saved'>('editor');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to track editor height
  useEffect(() => {
    if (!editorRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setEditorHeight(entry.contentRect.height);
      }
    });
    ro.observe(editorRef.current);
    return () => ro.disconnect();
  }, []);

  const handleRun = useCallback(() => {
    if (!sql.trim()) return;
    runQuery(sql.trim());
  }, [sql, runQuery]);

  const handleSave = useCallback(() => {
    if (!saveName.trim() || !sql.trim()) return;
    saveQuery(saveName.trim(), sql.trim());
    setSaveName('');
    setSaveDialogOpen(false);
  }, [saveName, sql, saveQuery]);

  // Check for Ctrl+Enter / Cmd+Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  }, [handleRun]);

  const loadSaved = (sq: SavedQuery) => {
    setSql(sq.sql);
    setActiveTab('editor');
  };

  const isError = queryResult?.columns?.[0]?.startsWith('Error:') ?? false;

  return (
    <div className={`flex flex-col h-full min-h-0 ${className ?? ''}`}>
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--rail)] bg-[var(--surface)] flex-shrink-0">
        <button
          onClick={handleRun}
          disabled={queryRunning || !sql.trim()}
          className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          {queryRunning ? (
            <span className="inline-block w-3 h-3 border border-[var(--text)]/30 border-t-[var(--text)] rounded-full animate-spin" />
          ) : (
            <span className="text-sm">▶</span>
          )}
          Run
          <span className="text-[10px] opacity-60 ml-1 hidden sm:inline">(⌘↵)</span>
        </button>

        {/* Example queries */}
        <div className="relative group">
          <button className="text-xs px-2 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]">
            Examples
          </button>
          <div className="absolute left-0 top-full mt-1 bg-[var(--surface)] border border-[var(--rail)] rounded shadow-xl z-50 hidden group-hover:block min-w-64">
            {EXAMPLE_QUERIES.map((eq, i) => (
              <button
                key={i}
                onClick={() => { setSql(eq.sql); setActiveTab('editor'); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--rail)]/50 border-b border-[var(--rail)] last:border-0"
              >
                <span className="text-[var(--text-muted)] font-medium">{eq.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Tab switcher */}
        <div className="flex rounded border border-[var(--rail)] overflow-hidden text-[10px]">
          {(['editor', 'history', 'saved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 ${activeTab === tab ? 'bg-[var(--rail)] text-[var(--text)]' : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'}`}
            >
              {tab === 'editor' ? 'Editor' : tab === 'history' ? `History (${queryHistory.length})` : `Saved (${savedQueries.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'editor' && (
          <button
            onClick={() => setSaveDialogOpen(true)}
            disabled={!sql.trim()}
            className="text-xs px-2 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-30"
          >
            Save
          </button>
        )}
        {activeTab === 'history' && queryHistory.length > 0 && (
          <button onClick={clearHistory} className="text-[10px] px-2 py-1 text-[var(--text-dim)] hover:text-[var(--danger)]">
            Clear
          </button>
        )}
      </div>

      {/* Save dialog */}
      {saveDialogOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border-b border-[var(--rail)]">
          <input
            type="text"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="Query name…"
            className="flex-1 bg-[var(--surface)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1 text-xs"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button onClick={handleSave} className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-[var(--text)]">Save</button>
          <button onClick={() => setSaveDialogOpen(false)} className="text-xs px-2 py-1 text-[var(--text-dim)]">Cancel</button>
        </div>
      )}

      {/* History panel */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto">
          {queryHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-[var(--text-dim)]">No query history yet.</div>
          ) : (
            <div className="divide-y divide-[var(--rail)]">
              {queryHistory.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => { setSql(entry.sql); setActiveTab('editor'); }}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--rail)]/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${entry.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {entry.status}
                    </span>
                    <span className="text-[10px] text-[var(--text-dim)] font-mono">{entry.rowCount} rows · {formatDuration(entry.durationMs)}</span>
                    <span className="text-[10px] text-[var(--text-dim)] ml-auto">{new Date(entry.executedAt).toLocaleTimeString()}</span>
                  </div>
                  <pre className="text-[10px] font-mono text-[var(--text-muted)] truncate">{entry.sql}</pre>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved queries panel */}
      {activeTab === 'saved' && (
        <div className="flex-1 overflow-y-auto">
          {savedQueries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-[var(--text-dim)]">No saved queries yet. Click Save in the editor.</div>
          ) : (
            <div className="divide-y divide-[var(--rail)]">
              {savedQueries.map(sq => (
                <div key={sq.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => loadSaved(sq)}
                      className="text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      {sq.name}
                    </button>
                    <button
                      onClick={() => deleteSavedQuery(sq.id)}
                      className="text-[var(--text-dim)] hover:text-[var(--danger)] p-0.5 rounded hover:bg-[var(--rail)]"
                    >
                      <HugeiconsIcon icon={Delete03Icon} size={12} />
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono text-[var(--text-muted)] truncate">{sq.sql}</pre>
                  <span className="text-[10px] text-[var(--text-dim)]">{new Date(sq.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      {activeTab === 'editor' && (
        <div ref={editorRef} className="flex-1 min-h-[120px]">
          <MonacoEditor
            height="100%"
            language="sql"
            value={sql}
            onChange={val => setSql(val ?? '')}
            onMount={(editor) => {
              // Add Ctrl+Enter keybinding
              editor.addCommand(/* KeyMod.CtrlCmd | KeyCode.Enter */ 2048 | 3, () => {
                handleRun();
              });
            }}
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
      )}

      {/* Results panel */}
      {queryResult && (
        <div ref={tableRef} className="border-t border-[var(--rail)] flex flex-col" style={{ maxHeight: '50%' }}>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-[var(--surface)] border-b border-[var(--rail)] flex-shrink-0">
            <span className="text-[10px] font-mono">
              <span className="text-[var(--text-dim)]">Rows:</span>{' '}
              <span className={isError ? 'text-rose-400' : 'text-[var(--text-muted)]'}>{queryResult.rowCount.toLocaleString()}</span>
            </span>
            <span className="text-[10px] font-mono">
              <span className="text-[var(--text-dim)]">Time:</span>{' '}
              <span className="text-[var(--text-muted)]">{formatDuration(queryResult.executionTimeMs)}</span>
            </span>
            {isError && (
              <span className="text-[10px] text-rose-400 font-mono ml-auto">{queryResult.columns?.[0]}</span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {!isError && queryResult.rows.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface)] sticky top-0 z-10">
                  <tr className="border-b border-[var(--rail)]">
                    {queryResult.columns.map(col => (
                      <th key={col} className="text-left px-3 py-2 font-mono font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[10px]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20">
                      {queryResult.columns.map(col => (
                        <td key={col} className="px-3 py-1.5 font-mono text-[var(--text-muted)] max-w-xs truncate" title={String(row[col] ?? 'NULL')}>
                          {row[col] === null
                            ? <span className="text-[var(--text-dim)] italic">NULL</span>
                            : typeof row[col] === 'object' ? JSON.stringify(row[col])
                            : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : !isError ? (
              <div className="flex items-center justify-center py-8 text-xs text-[var(--text-dim)]">Query returned 0 rows.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
