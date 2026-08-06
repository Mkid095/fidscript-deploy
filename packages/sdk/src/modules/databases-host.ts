/**
 * DatabasesHost — mixin target for DatabasesModule helpers.
 */

import type { FidscriptClient } from '../client';
import type {
  Database,
  BackupSchedule,
  BackupSettings,
} from './databases-types';

export interface DatabasesHost {
  readonly client: FidscriptClient;

  // CRUD
  list(projectId: string): Promise<Database[]>;
  get(databaseId: string): Promise<Database>;
  create(projectId: string, data: { name: string; type?: string; environment?: string }): Promise<Database>;
  delete(databaseId: string): Promise<{ success: boolean }>;
  database(databaseId: string): unknown;

  // Backups (legacy)
  backup(databaseId: string): Promise<{ backupId: string }>;
  listBackups(databaseId: string): Promise<unknown[]>;
  restore(databaseId: string, backupId: string): Promise<unknown>;

  // Credentials
  rotatePassword<T = unknown>(databaseId: string): Promise<T>;
  getConnection(databaseId: string, poolOnly?: boolean): Promise<{
    host: string; port: number; database: string; username: string; connectionString: string;
    pgbouncerHost?: string; pgbouncerPort?: number;
  }>;
  updateSsl(databaseId: string, ssl: boolean): Promise<unknown>;

  // Backup scheduling
  getBackupSchedule(databaseId: string): Promise<BackupSchedule | null>;
  updateBackupSchedule(databaseId: string, schedule: Partial<BackupSchedule>): Promise<BackupSchedule>;
  getBackupSettings(databaseId: string): Promise<BackupSettings>;
}