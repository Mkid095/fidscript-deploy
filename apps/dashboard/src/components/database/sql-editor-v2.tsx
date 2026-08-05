'use client';

import { useSqlEditor } from './sql-editor.use';
import { SqlEditorSidebar } from './SqlEditorSidebar';
import { SqlEditorTabBar } from './SqlEditorTabBar';
import { SqlEditorMonaco } from './SqlEditorMonaco';
import { SqlEditorResultsPane } from './SqlEditorResultsPane';

// ─── SqlEditorV2 ─────────────────────────────────────────────────────────────

export function SqlEditorV2() {
  const {
    tabs, activeTabId, activeTab, setActiveTabId, updateTab, addTab, closeTab,
    sidebarTab, setSidebarTab, tableSearch, setTableSearch,
    expandedSchemas, toggleSchema, bySchema, filteredTables, insertTableSQL,
    resultPaneTab, setResultPaneTab, logsEndRef,
    ratio, containerRef, handleMouseDown,
    handleRun, handleEditorMount, isError, result, queryRunning,
    queryLogs, clearLogs,
  } = useSqlEditor();

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <SqlEditorSidebar
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        tableSearch={tableSearch}
        setTableSearch={setTableSearch}
        expandedSchemas={expandedSchemas}
        toggleSchema={toggleSchema}
        bySchema={bySchema}
        filteredTables={filteredTables}
        insertTableSQL={insertTableSQL}
        activeTabId={activeTabId}
        updateTab={updateTab}
        addTab={addTab}
      />

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <SqlEditorTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          closeTab={closeTab}
          addTab={() => addTab()}
        />

        {/* Editor + Results split */}
        <div ref={containerRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Monaco Editor */}
          <div style={{ height: `${ratio * 100}%` }} className="min-h-0 flex-shrink-0">
            <SqlEditorMonaco
              value={activeTab?.sql ?? ''}
              onChange={val => updateTab(activeTabId, { sql: val, dirty: true })}
              onMount={handleEditorMount}
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
            <SqlEditorResultsPane
              resultPaneTab={resultPaneTab}
              setResultPaneTab={setResultPaneTab}
              result={result}
              isError={isError}
              activeTab={activeTab}
              queryRunning={queryRunning}
              queryLogs={queryLogs}
              logsEndRef={logsEndRef}
              handleRun={handleRun}
              canRun={!!activeTab?.sql.trim()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
