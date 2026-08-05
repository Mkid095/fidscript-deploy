'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { PlayIcon, Download01Icon, ChevronDownIcon, File01Icon } from '@hugeicons/core-free-icons';
import type { QueryResult } from '@/types';
import type { ResultPaneTab, SqlTab } from './sql-editor.types';
import { exportCSV, exportJSON } from './sql-editor.utils';
import { SqlEditorTable } from './SqlEditorTable';
import { SqlEditorMessagesTab } from './SqlEditorMessagesTab';

interface SqlEditorResultsPaneProps {
  resultPaneTab: ResultPaneTab;
  setResultPaneTab: (tab: ResultPaneTab) => void;
  result: QueryResult | null;
  isError: boolean;
  activeTab: SqlTab;
  queryRunning: boolean;
  queryLogs: string[];
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  handleRun: () => void;
  canRun: boolean;
}

export function SqlEditorResultsPane({
  resultPaneTab, setResultPaneTab, result, isError, activeTab,
  queryRunning, queryLogs, logsEndRef, handleRun, canRun,
}: SqlEditorResultsPaneProps) {
  return (
    <div className="min-h-0 flex flex-col flex-shrink-0 overflow-hidden">
      {/* Results tab bar */}
      <div className="flex items-center gap-0 px-2 bg-[var(--surface)] border-b border-[var(--rail)] flex-shrink-0">
        {(['results', 'messages', 'logs'] as ResultPaneTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setResultPaneTab(tab)}
            className={`px-3 py-2 text-[11px] font-medium border-b-2 -mb-px transition-colors ${
              resultPaneTab === tab ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'results' && result && !isError && <span className="ml-1.5 text-[9px] opacity-60">{result.rowCount.toLocaleString()} rows</span>}
            {tab === 'logs' && queryLogs.length > 0 && <span className="ml-1 text-[9px] opacity-60">{queryLogs.length}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={handleRun} disabled={queryRunning || !canRun}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] text-[11px] font-medium disabled:opacity-50 mb-0.5">
          {queryRunning ? <span className="w-3 h-3 border border-[var(--text)]/30 border-t-[var(--text)] rounded-full animate-spin" />
            : <HugeiconsIcon icon={PlayIcon} size={12} />}Run
        </button>
        {result && !isError && (
          <div className="relative group">
            <button className="flex items-center gap-1 px-2 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] text-[11px] mb-0.5">
              <HugeiconsIcon icon={Download01Icon} size={12} />Export<HugeiconsIcon icon={ChevronDownIcon} size={10} />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--rail)] rounded shadow-xl z-50 hidden group-hover:block min-w-[140px]">
              <button onClick={() => result && exportCSV(result.columns, result.rows)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-[var(--rail)]/30 text-left text-[var(--text)]">
                <HugeiconsIcon icon={File01Icon} size={12} />Export CSV
              </button>
              <button onClick={() => result && exportJSON(result.rows)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-[var(--rail)]/30 text-left text-[var(--text)]">
                <HugeiconsIcon icon={File01Icon} size={12} />Export JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {resultPaneTab === 'results' && (
          result && !isError ? <SqlEditorTable result={result} />
            : <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">Run a query to see results.</div>
        )}
        {resultPaneTab === 'messages' && (
          <div className="p-4"><SqlEditorMessagesTab result={result} isError={isError} activeTab={activeTab} /></div>
        )}
        {resultPaneTab === 'logs' && (
          queryLogs.length > 0 ? (
            <div className="p-2 space-y-0.5 font-mono text-[10px]">
              {queryLogs.map((log, i) => (
                <div key={i} className={`px-2 py-0.5 rounded ${log.includes('ERROR') ? 'text-rose-400 bg-rose-500/5' : 'text-[var(--text-muted)]'}`}>{log}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          ) : <div className="flex items-center justify-center h-full text-[11px] text-[var(--text-dim)]">No logs yet.</div>
        )}
      </div>
    </div>
  );
}
