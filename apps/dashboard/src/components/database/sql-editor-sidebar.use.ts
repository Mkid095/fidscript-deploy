import { useCallback, useMemo, useState } from 'react';

interface UseSqlSidebarReturn {
  sidebarTab: 'tables' | 'snippets';
  setSidebarTab: (tab: 'tables' | 'snippets') => void;
  tableSearch: string;
  setTableSearch: (s: string) => void;
  expandedSchemas: Set<string>;
  toggleSchema: (s: string) => void;
  bySchema: ReturnType<typeof useMemo<Record<string, unknown[]>>>;
  filteredTables: unknown[] | null;
}

export interface SchemaTable { schema: string; name: string; rowCount?: number }

export function useSqlSidebar(schema: SchemaTable[]) {
  const [sidebarTab, setSidebarTab] = useState<'tables' | 'snippets'>('tables');
  const [tableSearch, setTableSearch] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public']));

  const toggleSchema = useCallback((s: string) => {
    setExpandedSchemas(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }, []);

  const bySchema = useMemo(() =>
    schema.reduce<Record<string, SchemaTable[]>>((acc, t) => {
      (acc[t.schema] ||= []).push(t);
      return acc;
    }, {}),
    [schema]
  );

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return null;
    return schema.filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()));
  }, [schema, tableSearch]);

  return { sidebarTab, setSidebarTab, tableSearch, setTableSearch, expandedSchemas, toggleSchema, bySchema, filteredTables };
}
