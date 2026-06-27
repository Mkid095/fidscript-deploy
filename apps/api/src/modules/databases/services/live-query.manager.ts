/**
 * LiveQueryManager — the "Convex/InstantDB" magic.
 *
 * Provides `db.from(table).watch()` semantics:
 *   1. Initial fetch (returns current rows)
 *   2. Subscribe to realtime changes
 *   3. Auto-patch the local array on INSERT/UPDATE/DELETE
 *
 * Implementation:
 *   - Maintains a cache of subscriptions per (databaseId, table, filter)
 *   - On watch(), increments refcount + reuses the same underlying realtime
 *     connection (already established by DbRealtimeService)
 *   - On event, applies the change to a local materialized array
 *   - Subscribers receive the updated array via subscription callback
 *
 * The materialized array is shared across all subscribers to the same key,
 * making this efficient at scale.
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { DbDataService, QueryBuilder } from './db-data.service';
import { DbRealtimeService } from './db-realtime.service';
import type { RealtimeEvent } from '../providers/realtime/realtime-provider.interface';

interface LiveQuery {
  key: string;
  databaseId: string;
  table: string;
  rows: any[];
  refCount: number;
  lastFetchedAt: number;
  realtimeUnsub?: () => Promise<void>;
  eventUnsub?: () => void;
  listeners: Set<(rows: any[]) => void>;
}

export interface WatchOptions {
  pollIntervalMs?: number;
}

@Injectable()
export class LiveQueryManager {
  private readonly logger = new Logger(LiveQueryManager.name);
  private queries = new Map<string, LiveQuery>();

  constructor(
    private eventService: EventService,
    private data: DbDataService,
    private realtimeService: DbRealtimeService,
  ) {}

  async watch(
    databaseId: string,
    table: string,
    qb: QueryBuilder,
    callback: (rows: any[]) => void,
  ): Promise<() => Promise<void>> {
    const key = `${databaseId}:${table}:${this.hashQuery(qb)}`;

    let lq = this.queries.get(key);
    if (!lq) {
      const initial = await this.data.select(databaseId, qb);
      lq = {
        key,
        databaseId,
        table,
        rows: initial.rows,
        refCount: 0,
        lastFetchedAt: Date.now(),
        listeners: new Set(),
      };
      this.queries.set(key, lq);

      // Subscribe to realtime events for this table
      const unsub = await this.realtimeService.subscribeToTable(databaseId, 'public', table);
      lq.realtimeUnsub = unsub;

      const capturedLq = lq;
      const handler = ((e: any) => {
        if (e.databaseId !== databaseId || e.table !== table) return;
        this.applyPatch(capturedLq, e);
        capturedLq.listeners.forEach(l => l(capturedLq.rows));
      }) as any;
      lq.eventUnsub = this.eventService.on('database.row.changed', handler);
    }

    lq.refCount++;
    lq.listeners.add(callback);
    callback(lq.rows);

    return async () => {
      if (!lq) return;
      lq.refCount = Math.max(0, lq.refCount - 1);
      lq.listeners.delete(callback);
      if (lq.refCount === 0) {
        if (lq.realtimeUnsub) await lq.realtimeUnsub();
        if (lq.eventUnsub) lq.eventUnsub();
        this.queries.delete(key);
      }
    };
  }

  stats() {
    return {
      activeQueries: this.queries.size,
      totalSubscribers: Array.from(this.queries.values()).reduce((sum, q) => sum + q.refCount, 0),
    };
  }

  private applyPatch(lq: LiveQuery, e: RealtimeEvent): void {
    const pk = e.new?.id ?? e.old?.id;
    if (!pk) return;
    if (e.operation === 'DELETE') {
      lq.rows = lq.rows.filter(r => r.id !== pk);
      return;
    }
    const newRow = e.new;
    const idx = lq.rows.findIndex(r => r.id === pk);
    if (idx >= 0) {
      lq.rows = [...lq.rows.slice(0, idx), newRow, ...lq.rows.slice(idx + 1)];
    } else {
      lq.rows = [newRow, ...lq.rows];
    }
    lq.lastFetchedAt = Date.now();
  }

  private hashQuery(qb: QueryBuilder): string {
    return JSON.stringify({ ...(qb as any) }).slice(0, 200);
  }
}
