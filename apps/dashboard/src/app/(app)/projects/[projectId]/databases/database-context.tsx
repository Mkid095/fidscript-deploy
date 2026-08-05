'use client';

/**
 * DatabaseProvider — central store for the database dashboard.
 * Composes domain-specific hooks; business logic lives in *.hook.ts files.
 */
import { createContext, useEffect, useMemo, useState, useContext } from 'react';
import type { DatabaseContextValue } from './database-context-types';
import { useDatabaseSchema } from './database-context-schema-hook';
import { useDatabaseRows } from './database-context-rows-hook';
import { useDatabaseColumns } from './database-context-columns-hook';
import { useDatabaseMutations } from './database-context-mutations-hook';
import { useDatabaseSql } from './database-context-sql-hook';
import { useDatabaseSavedQueries } from './database-context-saved-queries-hook';
import { useDatabaseStatus } from './database-context-status-hook';
import { useDatabaseMigrations } from './database-context-migrations-hook';
import { useDatabaseBackup } from './database-context-backup-hook';
import { useDatabaseRealtime } from './database-context-realtime-hook';

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({
  projectId, databaseId, children,
}: {
  projectId: string;
  databaseId: string;
  children: React.ReactNode;
}) {
  // ── Domain state hooks ────────────────────────────────────────────────────
  const { database, setDatabase, schema, refreshSchema, loadingSchema } = useDatabaseSchema(databaseId);
  const [selectedTable, selectTable] = useState<string | null>(null);
  const { rowsByTable, fetchRows } = useDatabaseRows(databaseId);
  const { columnsCache, fetchColumns } = useDatabaseColumns(databaseId);
  const { insertRow, updateRow, deleteRows } = useDatabaseMutations(databaseId, fetchRows);
  const { queryResult, queryRunning, queryHistory, runQuery, clearHistory, queryLogs, clearLogs, appendLog } = useDatabaseSql(databaseId);
  const { savedQueries, saveQuery, deleteSavedQuery } = useDatabaseSavedQueries();
  const { dbStatus, refreshStatus } = useDatabaseStatus(databaseId);
  const { migrations, refreshMigrations, applyMigration } = useDatabaseMigrations(databaseId);
  const { backupSchedule, refreshBackupSchedule, updateBackupSchedule } = useDatabaseBackup(databaseId);
  const { realtimeTables, refreshRealtimeTables } = useDatabaseRealtime(databaseId);

  // ── Auto-load on databaseId change ───────────────────────────────────────
  useEffect(() => {
    if (databaseId) {
      refreshSchema();
      refreshStatus();
      refreshMigrations();
      refreshRealtimeTables();
      refreshBackupSchedule();
    }
  }, [databaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<DatabaseContextValue>(() => ({
    projectId, databaseId,
    database, setDatabase,
    schema, refreshSchema, loadingSchema,
    selectedTable, selectTable,
    rowsByTable, fetchRows,
    columnsCache, fetchColumns,
    insertRow, updateRow, deleteRows,
    queryResult, runQuery, queryRunning, queryHistory, clearHistory,
    queryLogs, clearLogs, appendLog,
    savedQueries, saveQuery, deleteSavedQuery,
    dbStatus, refreshStatus,
    migrations, refreshMigrations, applyMigration,
    backupSchedule, refreshBackupSchedule, updateBackupSchedule,
    realtimeTables, refreshRealtimeTables,
  }), [projectId, databaseId, database, schema, loadingSchema, selectedTable,
       rowsByTable, columnsCache, queryResult, queryRunning, queryHistory, savedQueries,
       dbStatus, migrations, backupSchedule, realtimeTables, queryLogs,
       fetchRows, fetchColumns, insertRow, updateRow, deleteRows, runQuery,
       clearHistory, clearLogs, appendLog, saveQuery, deleteSavedQuery, refreshStatus, refreshMigrations,
       applyMigration, refreshBackupSchedule, updateBackupSchedule, refreshRealtimeTables]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
