import { useCallback, useState } from 'react';
import type { SqlTab } from './sql-editor.types';

interface UseSqlTabsReturn {
  tabs: SqlTab[];
  activeTabId: string;
  activeTab: SqlTab;
  setActiveTabId: (id: string) => void;
  updateTab: (id: string, patch: Partial<SqlTab>) => void;
  addTab: (sql?: string, name?: string) => void;
  closeTab: (id: string) => void;
}

export function useSqlTabs(): UseSqlTabsReturn {
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
      const existing = prev.find(t => t.sql === sql);
      if (existing) { setActiveTabId(existing.id); return prev; }
      const id = `tab-${Date.now()}`;
      setActiveTabId(id);
      return [...prev, { id, name: name ?? `Query ${prev.length + 1}`, sql, dirty: false, status: 'idle', result: null, executionTimeMs: 0 }];
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
      if (id === activeTabId) setActiveTabId(next[Math.max(0, idx - 1)].id);
      return next;
    });
  }, [activeTabId]);

  return { tabs, activeTabId, activeTab, setActiveTabId, updateTab, addTab, closeTab };
}
