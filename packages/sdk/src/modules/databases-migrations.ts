/**
 * DatabaseProvider — migrations + realtime tables (extension class).
 * Split out of databases.ts for ANPAS 150-line limit. The class
 * inherits everything from `DatabaseProvider` in `./databases-queries.ts`
 * and adds migrations + realtime table methods.
 */

import { FidscriptClient } from '../client';
import type { MigrationRecord } from './databases-types';
import { DatabaseProvider } from './databases-provider';

export class DatabaseProviderWithMigrations extends DatabaseProvider {
  async migrations(): Promise<MigrationRecord[]> {
    return this.client.get(`/api/v1/databases/${this.id}/migrations`);
  }

  async applyMigration(sql: string, name?: string): Promise<MigrationRecord> {
    return this.client.post(`/api/v1/databases/${this.id}/migrations/apply`, { sql, name });
  }

  async realtimeTables(): Promise<{ schema: string; table: string; subscribers: number }[]> {
    return this.client.get(`/api/v1/databases/${this.id}/realtime`);
  }
}

/** Backwards-compatible export name. */
export { DatabaseProviderWithMigrations as DatabaseProvider };