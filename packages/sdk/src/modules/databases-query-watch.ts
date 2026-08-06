/**
 * QueryBuilder.watch() — SSE live-query implementation.
 * Split out of databases-query-builder.ts for ANPAS 150-line limit.
 */

import type { FidscriptClient } from '../client';
import type { LiveQueryResult, RealtimeEvent } from './databases-types';
import type { QueryBuilder } from './databases-query-builder';

/** Minimal EventSource interface — covers browser + a few polyfills. */
interface SseConnection {
  onmessage: ((e: { data: string }) => void) | null;
  onerror: ((e: Event) => void) | null;
  close(): void;
}

interface QueryBuilderInternals {
  getFilters(): Array<{ column: string; op: string; value: unknown }>;
  getLimit(): number;
  getPage(): number;
  getOrderBy(): string | undefined;
  getOrder(): 'asc' | 'desc';
  getClient(): FidscriptClient;
  getDatabaseId(): string;
  getTable(): string;
}

/** Attach `watch()` to a QueryBuilder instance via prototype assignment. */
export function applyWatchMethod<T>(builder: QueryBuilder<T>): void {
  (builder as unknown as { watch: () => Promise<LiveQueryResult<T>> }).watch = function (
    this: QueryBuilder<T> & QueryBuilderInternals,
  ): Promise<LiveQueryResult<T>> {
    return runWatch(this);
  };
}

async function runWatch<T>(
  qb: QueryBuilder<T> & QueryBuilderInternals,
): Promise<LiveQueryResult<T>> {
  const where: Record<string, unknown> = {};
  for (const f of qb.getFilters()) {
    if (f.op === 'eq') where[f.column] = f.value;
  }

  const params: Record<string, string> = { where: JSON.stringify(where) };
  if (qb.getLimit()) params.limit = String(qb.getLimit());
  if (qb.getPage()) params.page = String(qb.getPage());
  if (qb.getOrderBy()) {
    params.orderBy = qb.getOrderBy() as string;
    params.order = qb.getOrder();
  }

  const url = `/api/v1/databases/${qb.getDatabaseId()}/live-query/${qb.getTable()}?` +
    new URLSearchParams(params).toString();

  const token = readLocalStorageToken();
  const baseURL = qb.getClient().baseURL || '';
  const fullUrl = baseURL + url;
  const EventSourceCtor = resolveEventSourceCtor();
  if (!EventSourceCtor) {
    throw new Error('EventSource is not available — live queries require a browser environment');
  }
  const es: SseConnection = token
    ? new EventSourceCtor(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
    : new EventSourceCtor(fullUrl);

  const rows: T[] = [];
  const listeners: Array<(r: T[]) => void> = [];
  let closed = false;

  es.onmessage = (e) => {
    if (closed) return;
    try {
      const payload = JSON.parse(e.data) as { type: string; rows?: T[]; event?: RealtimeEvent<T> };
      if (payload.type === 'initial' && payload.rows) {
        rows.length = 0;
        rows.push(...payload.rows);
        listeners.forEach(l => l(rows));
      } else if (payload.type === 'patch' && payload.event) {
        const ev = payload.event;
        const pk = (ev.new as unknown as { id?: unknown } | null)?.id
          ?? (ev.old as unknown as { id?: unknown } | null)?.id;
        if (!pk) return;
        if (ev.operation === 'DELETE') {
          const idx = rows.findIndex((r) => (r as unknown as { id?: unknown }).id === pk);
          if (idx >= 0) rows.splice(idx, 1);
        } else if (ev.new) {
          const idx = rows.findIndex((r) => (r as unknown as { id?: unknown }).id === pk);
          if (idx >= 0) rows[idx] = ev.new;
          else rows.unshift(ev.new);
        }
        listeners.forEach(l => l(rows));
      }
    } catch {
      // ignore malformed payloads
    }
  };
  es.onerror = () => {
    // Browser will auto-reconnect EventSource on network errors
  };

  return {
    rows,
    push(newRows: T[]) { rows.length = 0; rows.push(...newRows); },
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

function readLocalStorageToken(): string | null {
  const g = globalThis as { localStorage?: { getItem(k: string): string | null } };
  if (!g.localStorage) return null;
  return g.localStorage.getItem('fidscript_access_token')
    ?? g.localStorage.getItem('fidscript_token')
    ?? null;
}

function resolveEventSourceCtor(): (new (url: string, init?: unknown) => SseConnection) | null {
  const g = globalThis as unknown as { EventSource?: new (url: string, init?: unknown) => SseConnection };
  return g.EventSource ?? null;
}