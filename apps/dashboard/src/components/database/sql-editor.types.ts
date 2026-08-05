import type { QueryResult } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SqlTab {
  id: string;
  name: string;
  sql: string;
  dirty: boolean;
  status: 'idle' | 'running' | 'success' | 'error';
  result: QueryResult | null;
  executionTimeMs: number;
}

export type ResultPaneTab = 'results' | 'messages' | 'logs';

// ─── Snippets ─────────────────────────────────────────────────────────────────

export const SNIPPETS: { label: string; sql: string }[] = [
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
