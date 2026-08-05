import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultPaneTab } from './sql-editor.types';
import { inferTabName } from './sql-editor.utils';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { useResizable } from '@/hooks/useResizable';
import { useSqlTabs } from './sql-editor-tabs.use';
import { useSqlSidebar } from './sql-editor-sidebar.use';

interface UseSqlEditorReturn {
  tabs: ReturnType<typeof useSqlTabs>['tabs'];
  activeTabId: string;
  activeTab: ReturnType<typeof useSqlTabs>['activeTab'];
  setActiveTabId: (id: string) => void;
  updateTab: (id: string, patch: Partial<ReturnType<typeof useSqlTabs>['activeTab']>) => void;
  addTab: (sql?: string, name?: string) => void;
  closeTab: (id: string) => void;
  sidebarTab: 'tables' | 'snippets';
  setSidebarTab: (tab: 'tables' | 'snippets') => void;
  tableSearch: string;
  setTableSearch: (s: string) => void;
  expandedSchemas: Set<string>;
  toggleSchema: (s: string) => void;
  bySchema: Record<string, { schema: string; name: string; rowCount?: number }[]>;
  filteredTables: { schema: string; name: string; rowCount?: number }[] | null;
  insertTableSQL: (tableName: string) => void;
  resultPaneTab: ResultPaneTab;
  setResultPaneTab: (tab: ResultPaneTab) => void;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  ratio: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleMouseDown: () => void;
  handleRun: () => Promise<void>;
  handleEditorMount: (editor: unknown) => void;
  isError: boolean;
  result: ReturnType<typeof useDatabase>['queryResult'];
  queryRunning: boolean;
  queryLogs: ReturnType<typeof useDatabase>['queryLogs'];
  clearLogs: () => void;
  saveQuery: (name: string, sql: string) => Promise<void>;
  deleteSavedQuery: (id: string) => Promise<void>;
}

export function useSqlEditor() {
  const {
    schema, queryResult, runQuery, queryRunning,
    saveQuery, deleteSavedQuery,
    queryLogs, clearLogs,
  } = useDatabase();

  const { tabs, activeTabId, activeTab, setActiveTabId, updateTab, addTab, closeTab } = useSqlTabs();
  const { sidebarTab, setSidebarTab, tableSearch, setTableSearch, expandedSchemas, toggleSchema, bySchema, filteredTables } = useSqlSidebar(schema);

  const [resultPaneTab, setResultPaneTab] = useState<ResultPaneTab>('results');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultPaneTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [queryLogs, resultPaneTab]);

  const { ratio, containerRef, handleMouseDown } = useResizable({
    initialRatio: 0.55, minRatio: 0.25, maxRatio: 0.8,
    storageKey: 'sql-editor-split', direction: 'vertical',
  });

  const insertTableSQL = useCallback((tableName: string) => {
    const sql = `SELECT * FROM ${tableName}\nLIMIT 100;`;
    updateTab(activeTabId, { sql, dirty: true, name: inferTabName(sql) });
  }, [activeTabId, updateTab]);

  const handleRun = useCallback(async () => {
    if (!activeTab?.sql.trim() || queryRunning) return;
    const sql = activeTab.sql.trim();
    updateTab(activeTabId, { status: 'running', result: null, executionTimeMs: 0 });
    clearLogs();
    const start = Date.now();
    try {
      const result = await runQuery(sql);
      updateTab(activeTabId, { status: 'success', result, executionTimeMs: Date.now() - start });
      setResultPaneTab('results');
    } catch {
      updateTab(activeTabId, { status: 'error', executionTimeMs: Date.now() - start });
      setResultPaneTab('messages');
    }
  }, [activeTab, activeTabId, queryRunning, runQuery, updateTab, clearLogs]);

  const handleEditorMount = useCallback((editor: unknown) => {
    const monaco = editor as { addCommand: (keyCode: number, handler: () => void) => void };
    monaco.addCommand(2048 | 3, () => handleRun());
    monaco.addCommand(2048 | 87, () => closeTab(activeTabId));
    monaco.addCommand(2048 | 83, () => {
      if (activeTab?.sql.trim()) saveQuery(inferTabName(activeTab.sql), activeTab.sql);
    });
  }, [handleRun, closeTab, activeTabId, activeTab, saveQuery]);

  const isError = activeTab?.result?.columns?.[0]?.startsWith('Error:') ?? false;
  const result = activeTab?.result;

  return {
    tabs, activeTabId, activeTab, setActiveTabId, updateTab, addTab, closeTab,
    sidebarTab, setSidebarTab, tableSearch, setTableSearch, expandedSchemas, toggleSchema,
    bySchema, filteredTables, insertTableSQL,
    resultPaneTab, setResultPaneTab, logsEndRef,
    ratio, containerRef, handleMouseDown,
    handleRun, handleEditorMount, isError, result, queryRunning, queryLogs, clearLogs,
    saveQuery, deleteSavedQuery,
  };
}
