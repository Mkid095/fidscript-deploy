/**
 * DatabasesModule — manages the lifecycle of managed databases per project.
 *
 * The new database-centric API (under /api/v1/databases/:id) is exposed via
 * `sdk.databases.database(id)` returning a `DatabaseProvider` (with migrations
 * + realtime tables mixed in).
 *
 * Sub-modules (each ≤150 lines):
 * - databases-types.ts            — entity types
 * - databases-host.ts             — DatabasesHost interface (mixin target)
 * - databases-backups.ts          — backup + scheduling methods (legacy)
 * - databases-provider.ts         — DatabaseProvider class
 * - databases-query-builder.ts    — QueryBuilder class (filters + CRUD)
 * - databases-query-watch.ts      — watch() SSE implementation
 * - databases-migrations.ts       — DatabaseProvider + migrations extension
 */

import { FidscriptClient } from '../client';
import type { Database } from './databases-types';
import type { DatabasesHost } from './databases-host';
import { applyBackupsMethods } from './databases-backups';
import { DatabaseProviderWithMigrations } from './databases-migrations';

export class DatabasesModule implements DatabasesHost {
  readonly client: FidscriptClient;

  // Backups (mixed in)
  backup!: (databaseId: string) => Promise<{ backupId: string }>;
  listBackups!: (databaseId: string) => Promise<unknown[]>;
  restore!: (databaseId: string, backupId: string) => Promise<unknown>;

  // Credentials (mixed in)
  rotatePassword!: <T = unknown>(databaseId: string) => Promise<T>;
  getConnection!: (databaseId: string, poolOnly?: boolean) => Promise<{
    host: string; port: number; database: string; username: string; connectionString: string;
    pgbouncerHost?: string; pgbouncerPort?: number;
  }>;
  updateSsl!: (databaseId: string, ssl: boolean) => Promise<unknown>;

  // Backup scheduling (mixed in)
  getBackupSchedule!: (databaseId: string) => Promise<import('./databases-types').BackupSchedule | null>;
  updateBackupSchedule!: (databaseId: string, schedule: Partial<import('./databases-types').BackupSchedule>) => Promise<import('./databases-types').BackupSchedule>;
  getBackupSettings!: (databaseId: string) => Promise<import('./databases-types').BackupSettings>;

  constructor(client: FidscriptClient) {
    this.client = client;
    applyBackupsMethods(this as unknown as DatabasesHost);
  }

  async list(projectId: string): Promise<Database[]> {
    const res = await this.client.get<{ databases: Database[] }>(
      `/api/v1/projects/${projectId}/databases`,
    );
    return res.databases ?? [];
  }

  async get(databaseId: string): Promise<Database> {
    return this.client.get<Database>(`/api/v1/databases/${databaseId}`);
  }

  async create(projectId: string, data: { name: string; type?: string; environment?: string }): Promise<Database> {
    return this.client.post<Database>(
      `/api/v1/projects/${projectId}/databases`,
      { type: 'postgresql', environment: 'production', ...data },
    );
  }

  async delete(databaseId: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/api/v1/databases/${databaseId}`);
  }

  database(databaseId: string): DatabaseProviderWithMigrations {
    return new DatabaseProviderWithMigrations(this.client, databaseId);
  }
}

// Re-exports
export {
  DatabaseProviderWithMigrations as DatabaseProvider,
} from './databases-migrations';
export { QueryBuilder } from './databases-query-builder';
export type {
  Database,
  BackupSchedule,
  BackupSettings,
  BackupScheduleFrequency,
  TableInfo,
  ColumnInfo,
  MigrationRecord,
  RealtimeEvent,
  RealtimeSubscription,
  DataResult,
  Op,
  LiveQueryResult,
} from './databases-types';