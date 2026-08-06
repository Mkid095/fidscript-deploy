/**
 * QueryBuilder — typed query DSL with realtime / live-query support.
 * The `watch()` method (heavy SSE implementation) lives in
 * `./databases-query-watch.ts` to keep this file under the 150-line ANPAS limit.
 */

import { FidscriptClient } from '../client';
import type { DataResult, Op, RealtimeEvent, RealtimeSubscription } from './databases-types';
import { applyWatchMethod } from './databases-query-watch';

export class QueryBuilder<T = unknown> {
  private filters: { column: string; op: Op; value: unknown }[] = [];
  private _limit = 50;
  private _page = 1;
  private _orderBy?: string;
  private _order: 'asc' | 'desc' = 'asc';

  constructor(private client: FidscriptClient, private databaseId: string, private table: string) {
    applyWatchMethod(this);
  }

  /** Delegated to ./databases-query-watch.ts. Declared here so callers see it. */
  declare watch: () => Promise<import('./databases-types').LiveQueryResult<T>>;

  eq(c: string, v: unknown): this { return this.push(c, 'eq', v); }
  neq(c: string, v: unknown): this { return this.push(c, 'neq', v); }
  gt(c: string, v: unknown): this { return this.push(c, 'gt', v); }
  gte(c: string, v: unknown): this { return this.push(c, 'gte', v); }
  lt(c: string, v: unknown): this { return this.push(c, 'lt', v); }
  lte(c: string, v: unknown): this { return this.push(c, 'lte', v); }
  like(c: string, v: unknown): this { return this.push(c, 'like', v); }
  ilike(c: string, v: unknown): this { return this.push(c, 'ilike', v); }
  is(c: string, v: unknown): this { return this.push(c, 'is', v); }
  in(c: string, v: unknown[]): this { return this.push(c, 'in', v); }
  notIn(c: string, v: unknown[]): this { return this.push(c, 'notIn', v); }

  order(c: string, d: 'asc' | 'desc' = 'asc'): this { this._orderBy = c; this._order = d; return this; }
  limit(n: number): this { this._limit = Math.max(1, n); return this; }
  page(n: number): this { this._page = Math.max(1, n); return this; }

  async select(columns?: string[]): Promise<DataResult<T>> {
    const params: Record<string, string> = {};
    if (this._limit) params.limit = String(this._limit);
    if (this._page) params.page = String(this._page);
    if (this._orderBy) { params.orderBy = this._orderBy; params.order = this._order; }
    if (columns?.length) params.columns = columns.join(',');
    if (this.filters.length > 0) {
      const where: Record<string, unknown> = {};
      for (const f of this.filters) if (f.op === 'eq') where[f.column] = f.value;
      if (Object.keys(where).length > 0) params.where = JSON.stringify(where);
    }
    return this.client.get<DataResult<T>>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`, params,
    );
  }

  async insert(data: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    const res = await this.client.post<{ row: T } | { rows: T[] }>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`, { data },
    );
    return 'rows' in res ? res.rows : res.row;
  }

  async update(patch: Partial<T>): Promise<T[]> {
    const where: Record<string, unknown> = {};
    for (const f of this.filters) if (f.op === 'eq') where[f.column] = f.value;
    if (Object.keys(where).length === 0) {
      throw new Error('update() requires at least one filter (.eq/.in/etc) to identify rows');
    }
    await this.client.delete<{ deleted: number }>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`, { where },
    );
    return this.insert(patch) as Promise<T[]>;
  }

  async delete(): Promise<number> {
    const where: Record<string, unknown> = {};
    for (const f of this.filters) if (f.op === 'eq') where[f.column] = f.value;
    const res = await this.client.delete<{ deleted: number }>(
      `/api/v1/databases/${this.databaseId}/tables/${this.table}/rows`, { where },
    );
    return res.deleted ?? 0;
  }

  async subscribe(callback: (event: RealtimeEvent<T>) => void): Promise<RealtimeSubscription> {
    const databaseId = this.databaseId;
    const table = this.table;
    const client = this.client;
    await client.post(`/api/v1/databases/${databaseId}/tables/${table}/realtime/enable`, {});
    const realtime = (client as unknown as { realtime?: RealtimeClientHandle }).realtime;
    if (!realtime) {
      throw new Error('Realtime client not available — authenticate before calling subscribe()');
    }
    const token = readLocalStorageToken() ?? '';
    await realtime.connect(token, databaseId);
    const unsub = await realtime.subscribe('database.row.changed', (raw: unknown) => {
      const e = raw as RealtimeEvent<T>;
      if (e.databaseId === databaseId && e.table === table) callback(e);
    });
    return {
      async unsubscribe() {
        await unsub();
        await client.post(
          `/api/v1/databases/${databaseId}/tables/${table}/realtime/disable`, {},
        ).catch(() => undefined);
      },
    };
  }

  /** Internal accessors — used by ./databases-query-watch.ts. */
  getFilters() { return this.filters; }
  getLimit() { return this._limit; }
  getPage() { return this._page; }
  getOrderBy() { return this._orderBy; }
  getOrder() { return this._order; }
  getClient() { return this.client; }
  getDatabaseId() { return this.databaseId; }
  getTable() { return this.table; }

  private push(c: string, op: Op, v: unknown): this {
    this.filters.push({ column: c, op, value: v });
    return this;
  }
}

interface RealtimeClientHandle {
  connect(token: string, databaseId: string): Promise<void>;
  subscribe(event: string, handler: (e: unknown) => void): Promise<() => Promise<void>>;
}

function readLocalStorageToken(): string | null {
  const g = globalThis as { localStorage?: { getItem(k: string): string | null } };
  if (!g.localStorage) return null;
  return g.localStorage.getItem('fidscript_access_token')
    ?? g.localStorage.getItem('fidscript_token')
    ?? null;
}
