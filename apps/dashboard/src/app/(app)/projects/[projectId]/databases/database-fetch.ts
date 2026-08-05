'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  normalizeDatabase,
  normalizeDatabaseStatus,
  normalizeMigrationRecord,
  normalizeQueryResult,
  normalizeRealtimeTables,
  type RawDataResult,
  type RawMigrationRecord,
  type RawRealtimeSubscriber,
} from '@/lib/db-normalize';
import type { BackupSchedule, ColumnInfo, Database, MigrationRecord, TableInfo } from '@/types';
import { type DatabaseModuleExt, type DatabaseStatus, type RealtimeTableInfo, type TableRowsState } from './database-utils';

type RowsSetter = React.Dispatch<React.SetStateAction<Record<string, TableRowsState>>>;
type ColumnsSetter = React.Dispatch<React.SetStateAction<Record<string, ColumnInfo[]>>>;
type RealtimeSetter = React.Dispatch<React.SetStateAction<RealtimeTableInfo[]>>;
type StatusSetter = React.Dispatch<React.SetStateAction<DatabaseStatus | null>>;

export interface SchemaFetchSetters {
  setSchema: (next: TableInfo[]) => void;
  setDatabase: (next: Database | null) => void;
  setLoadingSchema: (loading: boolean) => void;
  setRowsByTable: RowsSetter;
  setColumnsCache: ColumnsSetter;
}

export function useDatabaseSchemaFetch(databaseId: string | null, setters: SchemaFetchSetters) {
  const { getSdk } = useAuth();
  const { setSchema, setDatabase, setLoadingSchema, setRowsByTable, setColumnsCache } = setters;

  const refreshSchema = useCallback(async () => {
    if (!databaseId) return;
    setLoadingSchema(true);
    try {
      const [dbInfo, tables] = await Promise.all([
        getSdk().databases.get(databaseId).catch(() => null),
        getSdk().database(databaseId).schema() as Promise<TableInfo[]>,
      ]);
      if (dbInfo) setDatabase(normalizeDatabase(dbInfo as unknown as Parameters<typeof normalizeDatabase>[0]));
      setSchema(tables);
    } catch (error) { console.error('refreshSchema failed', error); }
    finally { setLoadingSchema(false); }
  }, [databaseId, getSdk, setDatabase, setLoadingSchema, setSchema]);

  const fetchRows = useCallback(async (table: string, opts: { page?: number; limit?: number } = {}) => {
    if (!databaseId) return;
    setRowsByTable(prev => ({ ...prev, [table]: { data: [], total: 0, loading: true, error: undefined } }));
    try {
      const result = normalizeQueryResult(await getSdk().database(databaseId).from(table).limit(opts.limit ?? 50).page(opts.page ?? 1).select() as RawDataResult<Record<string, unknown>>);
      setRowsByTable(prev => ({ ...prev, [table]: { data: result.rows, total: result.rowCount, loading: false } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRowsByTable(prev => ({ ...prev, [table]: { data: [], total: 0, loading: false, error: message } }));
    }
  }, [databaseId, getSdk, setRowsByTable]);

  const fetchColumns = useCallback(async (table: string) => {
    if (!databaseId) return;
    try {
      const columns = await getSdk().database(databaseId).columns(table) as unknown as ColumnInfo[];
      setColumnsCache(prev => ({ ...prev, [table]: columns }));
    } catch { /* ignore */ }
  }, [databaseId, getSdk, setColumnsCache]);

  return { refreshSchema, fetchRows, fetchColumns };
}

export interface OperationsFetchSetters {
  setDbStatus: StatusSetter;
  setMigrations: (next: MigrationRecord[]) => void;
  setBackupSchedule: (next: BackupSchedule | null) => void;
  setRealtimeTables: RealtimeSetter;
}

export function useDatabaseOperationsFetch(databaseId: string | null, setters: OperationsFetchSetters) {
  const { getSdk } = useAuth();
  const { setDbStatus, setMigrations, setBackupSchedule, setRealtimeTables } = setters;

  const refreshStatus = useCallback(async () => {
    if (!databaseId) return;
    try { setDbStatus(normalizeDatabaseStatus(await getSdk().database(databaseId).status() as Record<string, unknown>)); }
    catch { /* ignore */ }
  }, [databaseId, getSdk, setDbStatus]);

  const refreshMigrations = useCallback(async () => {
    if (!databaseId) return;
    try { setMigrations((await getSdk().database(databaseId).migrations() as unknown as RawMigrationRecord[]).map(normalizeMigrationRecord)); }
    catch { /* ignore */ }
  }, [databaseId, getSdk, setMigrations]);

  const applyMigration = useCallback(async (sql: string, name?: string) => {
    if (!databaseId) return;
    await getSdk().database(databaseId).applyMigration(sql, name);
    await refreshMigrations();
  }, [databaseId, getSdk, refreshMigrations]);

  const refreshBackupSchedule = useCallback(async () => {
    if (!databaseId) return;
    try { setBackupSchedule(await (getSdk().databases as unknown as DatabaseModuleExt).getBackupSchedule(databaseId)); }
    catch { /* ignore */ }
  }, [databaseId, getSdk, setBackupSchedule]);

  const updateBackupSchedule = useCallback(async (schedule: Partial<BackupSchedule> & { frequency: string }) => {
    if (!databaseId) return;
    setBackupSchedule(await (getSdk().databases as unknown as DatabaseModuleExt).updateBackupSchedule(databaseId, schedule));
  }, [databaseId, getSdk, setBackupSchedule]);

  const refreshRealtimeTables = useCallback(async () => {
    if (!databaseId) return;
    try { setRealtimeTables(normalizeRealtimeTables(await getSdk().database(databaseId).realtimeTables() as unknown as RawRealtimeSubscriber[])); }
    catch { /* ignore */ }
  }, [databaseId, getSdk, setRealtimeTables]);

  return { refreshStatus, refreshMigrations, applyMigration, refreshBackupSchedule, updateBackupSchedule, refreshRealtimeTables };
}
