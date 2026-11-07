/**
 * DatabaseProvider — schema, columns, query, status, connection.
 * Split out of databases.ts for ANPAS 150-line limit.
 *
 * Extended by `DatabaseProviderWithMigrations` (see ./databases-migrations.ts)
 * with migrations + realtime table methods.
 */

import { FidscriptClient } from '../client';
import type { TableInfo, ColumnInfo } from './databases-types';
import { QueryBuilder } from './databases-query-builder';

export class DatabaseProvider {
  protected readonly client: FidscriptClient;

  constructor(client: FidscriptClient, public readonly id: string) {
    this.client = client;
  }

  async schema(): Promise<TableInfo[]> {
    const res = await this.client.get<TableInfo[] | { tables: TableInfo[] }>(`/api/v1/databases/${this.id}/tables`);
    return Array.isArray(res) ? res : res.tables ?? [];
  }

  async columns(table: string, schema = 'public'): Promise<ColumnInfo[]> {
    return this.client.get<ColumnInfo[]>(`/api/v1/databases/${this.id}/tables/${table}/columns`, { schema });
  }

  async query<T = unknown>(sql: string, params?: unknown[]) {
    return this.client.post(`/api/v1/databases/${this.id}/query`, { sql, params });
  }

  async status() {
    return this.client.get(`/api/v1/databases/${this.id}/status`);
  }

  async connection() {
    return this.client.get(`/api/v1/databases/${this.id}/connection`);
  }

  async rotatePassword() {
    return this.client.post(`/api/v1/databases/${this.id}/credentials/rotate`, {});
  }

  from<T = unknown>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.client, this.id, table);
  }
}
