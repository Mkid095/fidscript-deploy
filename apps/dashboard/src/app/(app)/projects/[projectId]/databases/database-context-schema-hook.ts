'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { normalizeDatabase } from '@/lib/db-normalize';
import type { Database, TableInfo } from '@/types';

export function useDatabaseSchema(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [database, setDatabase] = useState<Database | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);

  const refreshSchema = useCallback(async () => {
    if (!databaseId) return;
    setLoadingSchema(true);
    try {
      const sdk = getSdk();
      const [dbInfo, tables] = await Promise.all([
        sdk.databases.get(databaseId).catch(() => null),
        sdk.database(databaseId).schema() as Promise<TableInfo[]>,
      ]);
      if (dbInfo) setDatabase(normalizeDatabase(dbInfo as unknown as Parameters<typeof normalizeDatabase>[0]));
      setSchema(tables);
    } catch (err) {
      console.error('refreshSchema failed', err);
    } finally {
      setLoadingSchema(false);
    }
  }, [databaseId, getSdk]);

  return { database, setDatabase, schema, refreshSchema, loadingSchema };
}
