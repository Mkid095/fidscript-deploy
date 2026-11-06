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

  // Backups. The routes are project-scoped — a database belongs to a
  // project and the project's members are who may back it up.
  backup(projectId: string, databaseId: string): Promise<{ backupId: string }>;
  listBackups(projectId: string, databaseId: string): Promise<unknown[]>;
  restore(projectId: string, databaseId: string, backupId: string): Promise<unknown>;

  // Credentials
  rotatePassword<T = unknown>(projectId: string, databaseId: string): Promise<T>;
  getConnection(projectId: string, databaseId: string, poolOnly?: boolean): Promise<{
    host: string; port: number; database: string; username: string; connectionString: string;
    pgbouncerHost?: string; pgbouncerPort?: number;
  }>;
  updateSsl(projectId: string, databaseId: string, ssl: boolean): Promise<unknown>;

  // Backup scheduling
  getBackupSchedule(projectId: string, databaseId: string): Promise<BackupSchedule | null>;
  updateBackupSchedule(projectId: string, databaseId: string, schedule: Partial<BackupSchedule>): Promise<BackupSchedule>;
  getBackupSettings(projectId: string, databaseId: string): Promise<BackupSettings>;
}