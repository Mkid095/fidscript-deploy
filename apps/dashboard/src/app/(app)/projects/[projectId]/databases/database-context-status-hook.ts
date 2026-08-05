'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { normalizeDatabaseStatus } from '@/lib/db-normalize';
import type { DatabaseStatus } from './database-context-types';

export function useDatabaseStatus(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const raw = await sdk.database(databaseId).status() as Record<string, unknown>;
      setDbStatus(normalizeDatabaseStatus(raw));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  return { dbStatus, refreshStatus };
}
