import { FidscriptClient } from '../client';

/**
 * Database provisioning — manages the lifecycle of managed databases per project.
 * The new database-centric API (under /api/v1/databases/:id) is exposed via
 * `sdk.databases.database(id)` returning a DatabaseProvider.
 */
export class DatabasesModule {
  constructor(private client: FidscriptClient) {}

  async list(projectId: string) {
    const res = await this.client.get<{ databases: Database[] }>(
      `/api/v1/projects/${projectId}/databases`,
    );
    return res.databases ?? [];
  }

  async get(databaseId: string): Promise<Database> {
    return this.client.get<Database>(`/api/v1/databases/${databaseId}`);
  }

  async create(projectId: string, data: { name: string; type?: string; environment?: string }) {
    return this.client.post<Database>(
      `/api/v1/projects/${projectId}/databases`,
      { type: 'postgresql', environment: 'production', ...data },
    );
  }

  async delete(databaseId: string) {
    return this.client.delete<{ success: boolean }>(`/api/v1/databases/${databaseId}`);
  }

  // ── Legacy compatibility (will be removed once dashboard migrates) ────────

  async backup(databaseId: string) {
    return this.client.post<{ backupId: string }>(`/api/v1/databases/${databaseId}/backups`, {});
  }

  async listBackups(databaseId: string) {
    const res = await this.client.get<{ backups: any[] }>(`/api/v1/databases/${databaseId}/backups`);
    return res.backups ?? [];
  }

  async restore(databaseId: string, backupId: string) {
    return this.client.post(`/api/v1/databases/${databaseId}/backups/${backupId}/restore`, {});
  }

  async rotatePassword(databaseId: string) {
    return this.client.post(`/api/v1/databases/${databaseId}/credentials/rotate`, {});
  }

  async getConnection(databaseId: string, poolOnly = false): Promise<{
    host: string; port: number; database: string; username: string; connectionString: string;
    pgbouncerHost?: string; pgbouncerPort?: number;
  }> {
    const params = poolOnly ? '?poolOnly=true' : '';
    return this.client.get(`/api/v1/databases/${databaseId}/connection${params}`);
  }

  async updateSsl(databaseId: string, ssl: boolean) {
    return this.client.post(`/api/v1/databases/${databaseId}/credentials/rotate`, { ssl });
  }

  database(databaseId: string): DatabaseProvider {
    return new DatabaseProvider(this.client, databaseId);
  }
}

export interface Database {
  id: string;
  projectId: string;
  ownerId?: string;
  name: string;
  environment: string;
  type: string;
  version: string;
  status: string;
  sizeBytes: number;
  maxConnections: number;
  createdAt: string;
  updatedAt: string;
  connectionString?: string;
}

export interface RealtimeEvent<T = any> {
  version: 1;
  organizationId?: string;
  projectId: string;
  environmentId?: string;
  databaseId: string;
  schema: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  new: T | null;
  old: T | null;
  timestamp: string;
  xid?: number;
}

export interface RealtimeSubscription {
  unsubscribe(): Promise<void>;
}

export type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'notIn';

export interface DataResult<T = any> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * LiveQueryResult — returned by .watch().
 * The `rows` array is kept in sync with realtime changes. Subscribe to
 * notifications via .subscribe(callback) for re-render triggers.
 */
export interface LiveQueryResult<T = any> {
  rows: T[];
  /** Replace the local array (useful for optimistic updates). */
  push(rows: T[]): void;
  /** Subscribe to row changes. The callback fires immediately with current rows. */
  subscribe(callback: (rows: T[]) => void): () => void;
  /** Stop streaming and release the server-side subscription. */
  unsubscribe(): Promise<void>;
}

export class QueryBuilder<T = any> {
  private filters: { column: string; op: Op; value: any }[] = [];
  private _limit = 50;
  private _page = 1;
  private _orderBy?: string;
  private _order: 'asc' | 'desc' = 'asc';

  constructor(private client: FidscriptClient, private databaseId: string, private table: string) {}

  /**
   * LiveQuery — the Convex/InstantDB magic.
   *
   * 1. Fetches initial rows
   * 2. Subscribes to realtime changes
   * 3. Auto-patches the array on INSERT/UPDATE/DELETE
   *
   * Returns a LiveQueryResult with the rows (kept in sync), unsubscribe(), and
   * a push() method to replace the array.
   */
  async watch(): Promise<LiveQueryResult<T>> {
    const where: Record<string, any> = {};
    for (const f of this.filters) {
      if (f.op === 'eq') where[f.column] = f.value;
    }

    const params: Record<string, string> = {
      where: JSON.stringify(where),
    };
    if (this._limit) params.limit = String(this._limit);
    if (this._page) params.page = String(this._page);
    if (this._orderBy) {
      params.orderBy = this._orderBy;
      params.order = this._order;
    }

    const url = `/api/v1/databases/${this.databaseId}/live-query/${this.table}?` +
      new URLSearchParams(params).toString();

    // Open SSE stream
    const token = (globalThis as any).localStorage
      ? (globalThis as any).localStorage.getItem('fidscript_access_token')
        ?? (globalThis as any).localStorage.getItem('fidscript_token') ?? ''
      : '';
    const baseURL = (this.client as any).baseURL || '';
    const fullUrl = baseURL + url;
    const EventSource = (globalThis as any).EventSource;
    const es = token ? new EventSource(fullUrl, { headers: { Authorization: `Bearer ${token}` } }) : new EventSource(fullUrl);

    const rows: T[] = [];
    const listeners: Array<(r: T[]) => void> = [];
    let closed = false;

    es.onmessage = (e: any) => {
      if (closed) return;
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'initial') {
          rows.length = 0;
          rows.push(...payload.rows);
          listeners.forEach(l => l(rows));
        } else if (payload.type === 'patch') {
          const ev = payload.event;
          const pk = ev.new?.id ?? ev.old?.id;
          if (!pk) return;
          if (ev.operation === 'DELETE') {
            const idx = rows.findIndex((r: any) => r.id === pk);
            if (idx >= 0) rows.splice(idx, 1);
          } else {
            const idx = rows.findIndex((r: any) => r.id === pk);
            if (idx >= 0) rows[idx] = ev.new;
            else rows.unshift(ev.new);
          }
          listeners.forEach(l => l(rows));
        }
      } catch (err) { /* ignore */ }
    };
    es.onerror = () => {
      // Browser will auto-reconnect EventSource on network errors
    };

    return {
      rows,
      push(rows: T[]) { Object.assign(rows, rows); },
      subscribe(callback: (rows: T[]) => void) {
        listeners.push(callback);
        callback(rows);
        return () => {
          const idx = listeners.indexOf(callback);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      },
      async unsubscribe() {
        closed = true;
        es.close();
      },
    };
  }


  eq(c: string, v: any): this { return this.push(c, 'eq', v); }
  neq(c: string, v: any): this { return this.push(c, 'neq', v); }
  gt(c: string, v: any): this { return this.push(c, 'gt', v); }
  gte(c: string, v: any): this { return this.push(c, 'gte', v); }
  lt(c: string, v: any): this { return this.push(c, 'lt', v); }
  lte(c: string, v: any): this { return this.push(c, 'lte', v); }
  like(c: string, v: any): this { return this.push(c, 'like', v); }
  ilike(c: string, v: any): this { return this.push(c, 'ilike', v); }
  is(c: string, v: any): this { return this.push(c, 'is', v); }
  in(c: string, v: any[]): this { return this.push(c, 'in', v); }
  notIn(c: string, v: any[]): this { return this.push(c, 'notIn', v); }

  order(c: string, d: 'asc' | 'desc' = 'asc'): this { this._orderBy = c; this._order = d; return this; }
  limit(n: number): this { this._limit = Math.max(1, n); return this; }
  page(n: number): this { this._page = Math.max(1, n); return this; }

  async select(columns?: string[]): Promise<DataResult<T>> {
    const params: Record<string, string> = {};
    if (this._limit) params.limit = String(this._limit);
    if (this._page) params.page = String(this._page);
    if (this._orderBy) {
      params.orderBy = this._orderBy;
      params.order = this._order;
    }
    if (columns?.length) params.columns = columns.join(',');
    if (this.filters.length > 0) {
      const where: Record<string, any> = {};
      for (const f of this.filters) {
        if (f.op === 'eq') where[f.column] = f.value;
      }
      if (Object.keys(where).length > 0) params.where = JSON.stringify(where);
    }
    return this.client.get<DataResult<T>>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`,
      params,
    );
  }

  async insert(data: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    const res = await this.client.post<{ row: T } | { rows: T[] }>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`,
      { data },
    );
    return 'rows' in res ? res.rows : res.row;
  }

  async update(patch: Partial<T>): Promise<T[]> {
    const where: Record<string, any> = {};
    for (const f of this.filters) if (f.op === 'eq') where[f.column] = f.value;
    if (Object.keys(where).length === 0) {
      throw new Error('update() requires at least one filter (.eq/.in/etc) to identify rows');
    }
    await this.client.delete<{ deleted: number }>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`,
      { where },
    );
    return this.insert(patch) as Promise<T[]>;
  }

  async delete(): Promise<number> {
    const where: Record<string, any> = {};
    for (const f of this.filters) if (f.op === 'eq') where[f.column] = f.value;
    const res = await this.client.delete<{ deleted: number }>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`,
      { where },
    );
    return res.deleted ?? 0;
  }

  async subscribe(callback: (event: RealtimeEvent<T>) => void): Promise<RealtimeSubscription> {
    const databaseId = this.databaseId;
    const table = this.table;
    const client = this.client;
    await client.post(
      `/api/v1/databases/${databaseId}/tables/${table}/realtime/enable`,
      {},
    );

    const realtime = (client as any).realtime;
    if (!realtime) {
      throw new Error('Realtime client not available — authenticate before calling subscribe()');
    }
    // Token retrieval is environment-specific — only browsers have localStorage.
    // Server-side SDK users should pass the token explicitly via the client.
    let token = '';
    const g = globalThis as any;
    if (g && typeof g.localStorage !== 'undefined') {
      token = g.localStorage.getItem('fidscript_access_token')
        ?? g.localStorage.getItem('fidscript_token')
        ?? '';
    }

    await realtime.connect(token, databaseId);
    const unsub = realtime.subscribe('database.row.changed', (e: RealtimeEvent<T>) => {
      if (e.databaseId === databaseId && e.table === table) callback(e);
    });

    return {
      async unsubscribe() {
        await unsub();
        await client.post(
          `/api/v1/databases/${databaseId}/tables/${table}/realtime/disable`,
          {},
        ).catch(() => {});
      },
    };
  }

  private push(c: string, op: Op, v: any): this {
    this.filters.push({ column: c, op, value: v });
    return this;
  }
}

export class DatabaseProvider {
  constructor(private client: FidscriptClient, public readonly id: string) {}

  async schema(): Promise<TableInfo[]> {
    const res = await this.client.get<TableInfo[] | { tables: TableInfo[] }>(`/api/v1/databases/${this.id}/tables`);
    return Array.isArray(res) ? res : (res as any).tables ?? [];
  }

  async columns(table: string, schema = 'public'): Promise<ColumnInfo[]> {
    return this.client.get<ColumnInfo[]>(`/api/v1/databases/${this.id}/tables/${table}/columns`, { schema });
  }

  async query<T = any>(sql: string, params?: any[]) {
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

  async migrations(): Promise<MigrationRecord[]> {
    return this.client.get(`/api/v1/databases/${this.id}/migrations`);
  }

  async applyMigration(sql: string, name?: string): Promise<MigrationRecord> {
    return this.client.post(`/api/v1/databases/${this.id}/migrations/apply`, { sql, name });
  }

  async realtimeTables(): Promise<{ schema: string; table: string; subscribers: number }[]> {
    return this.client.get(`/api/v1/databases/${this.id}/realtime`);
  }

  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.client, this.id, table);
  }
}

export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view';
  rowCount?: number;
  sizeBytes?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  ordinalPosition: number;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string | null;
  characterMaximumLength?: number | null;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  comment?: string | null;
}

export interface MigrationRecord {
  id: number;
  name: string;
  checksum: string;
  appliedAt: string;
  executionTimeMs: number;
  appliedBy?: string | null;
  success: boolean;
}
