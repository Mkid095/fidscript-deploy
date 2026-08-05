'use client';

import { useCallback, useState } from 'react';
import type { SavedQuery } from './database-context-types';

export function useDatabaseSavedQueries() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  const saveQuery = useCallback((name: string, sql: string) => {
    setSavedQueries(prev => [{
      id: crypto.randomUUID(),
      name,
      sql,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const deleteSavedQuery = useCallback((id: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== id));
  }, []);

  return { savedQueries, saveQuery, deleteSavedQuery };
}
