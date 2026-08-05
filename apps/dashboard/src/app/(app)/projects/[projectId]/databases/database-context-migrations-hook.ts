'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { normalizeMigrationRecord } from '@/lib/db-normalize';
import type { RawMigrationRecord } from '@/lib/db-normalize';
import type { MigrationRecord } from '@/types';

export function useDatabaseMigrations(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);

  const refreshMigrations = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const recs = await sdk.database(databaseId).migrations() as unknown as RawMigrationRecord[];
      setMigrations(recs.map(normalizeMigrationRecord));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  const applyMigration = useCallback(async (sql: string, name?: string, source?: 'api' | 'cli' | 'manual') => {
    if (!databaseId) return;
    const sdk = getSdk();
    const result = await sdk.database(databaseId).applyMigration(sql, name) as unknown as RawMigrationRecord;
    void result;
    await refreshMigrations();
  }, [databaseId, getSdk, refreshMigrations]);

  return { migrations, refreshMigrations, applyMigration };
}
