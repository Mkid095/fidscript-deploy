/**
 * DbRealtimeService — manages realtime triggers on database tables.
 *
 * Key principle: tables are REALTIME-CAPABLE by default but only
 * REALTIME-ACTIVE when there are subscribers. We avoid creating triggers on
 * every table in the system — that would be expensive on high-write tables
 * (logs, analytics) where nobody is subscribed.
 *
 * Lifecycle:
 *   First subscribe → create trigger rt_<table> (references shared realtime_notify())
 *   More subscribers → increment refcount
 *   All unsubscribed → schedule idle timer (30min)
 *   After 30min idle → DROP TRIGGER (refcount=0)
 *
 * The realtime_notify() pl/pgsql function is created once per database
 * on first realtime enable. It emits a versioned JSON payload via pg_notify
 * to the channel `db_<databaseId>`, which the NotifyRealtimeProvider listens on.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DbQueryService } from './db-query.service';
import { DbPoolService } from './db-pool.service';
import { SchemaCacheService } from './schema-cache.service';
import { NotifyRealtimeProvider } from '../providers/realtime/notify-realtime.provider';
import type { RealtimeProvider, RealtimeEvent } from '../providers/realtime/realtime-provider.interface';

const IDLE_DISABLE_MS = 30 * 60 * 1000;  // 30 minutes after last unsubscribe

// ── SQL templates ──────────────────────────────────────────────────────
const REALTIME_NOTIFY_FN_SQL = `
  CREATE OR REPLACE FUNCTION realtime_notify() RETURNS TRIGGER AS $$
  DECLARE
    payload JSONB;
    channel TEXT;
    base_event JSONB;
  BEGIN
    channel := 'db_' || TG_TABLE_SCHEMA || '_' || TG_TABLE_NAME;

    IF TG_OP = 'DELETE' THEN
      payload := jsonb_build_object(
        'version', 1,
        'schema', TG_TABLE_SCHEMA,
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'new', NULL,
        'old', to_jsonb(OLD),
        'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      );
    ELSIF TG_OP = 'UPDATE' THEN
      payload := jsonb_build_object(
        'version', 1,
        'schema', TG_TABLE_SCHEMA,
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'new', to_jsonb(NEW),
        'old', to_jsonb(OLD),
        'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      );
    ELSE -- INSERT
      payload := jsonb_build_object(
        'version', 1,
        'schema', TG_TABLE_SCHEMA,
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'new', to_jsonb(NEW),
        'old', NULL,
        'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      );
    END IF;

    PERFORM pg_notify(channel, payload::text);
    RETURN COALESCE(NEW, OLD);
  END;
  $$ LANGUAGE plpgsql;
`;

const ENABLE_TRIGGER_SQL = (schema: string, table: string) => `
  CREATE TRIGGER rt_${table}
  AFTER INSERT OR UPDATE OR DELETE ON "${schema}"."${table}"
  FOR EACH ROW EXECUTE FUNCTION realtime_notify();
`;

const DISABLE_TRIGGER_SQL = (table: string) => `DROP TRIGGER IF EXISTS rt_${table} ON "${table}";`;

interface TableRefcount {
  count: number;
  idleTimer?: NodeJS.Timeout;
}

@Injectable()
export class DbRealtimeService {
  private readonly logger = new Logger(DbRealtimeService.name);
  // Reference counts per database.table (e.g. "<dbId>:public.users")
  private refcounts = new Map<string, TableRefcount>();
  // Map from channel name → handler that the SDK subscribed via
  private channelSubscriptions = new Map<string, { unsubscribe: () => Promise<void> }>();

  constructor(
    private queryService: DbQueryService,
    private poolService: DbPoolService,
    private schemaCache: SchemaCacheService,
    private notifyProvider: NotifyRealtimeProvider,
  ) {}

  /**
   * Subscribe to changes on a table. Creates the trigger on first subscribe
   * (refcount 0→1), increments refcount on subsequent subscribes, and
   * schedules auto-disable after 30min idle.
   */
  async subscribeToTable(databaseId: string, schema: string, table: string): Promise<() => Promise<void>> {
    this.validateIdent(schema);
    this.validateIdent(table);
    const key = this.refKey(databaseId, schema, table);

    const ref = this.refcounts.get(key) ?? { count: 0 };
    ref.count++;
    if (ref.idleTimer) { clearTimeout(ref.idleTimer); ref.idleTimer = undefined; }
    this.refcounts.set(key, ref);

    // First subscriber — create the function + trigger.
    // Drop any existing trigger first so re-enabling is idempotent across API
    // restarts (the trigger persists in the DB; the in-memory refcount does not).
    // DROP and CREATE run as separate statements — node-postgres returns an
    // array (not a single result) for multi-statement queries, which breaks
    // executeParameterized's result handling.
    if (ref.count === 1) {
      await this.ensureFunction(databaseId);
      await this.queryService.executeParameterized(
        databaseId,
        `DROP TRIGGER IF EXISTS rt_${table} ON "${schema}"."${table}"`,
        [],
      );
      await this.queryService.executeParameterized(databaseId, ENABLE_TRIGGER_SQL(schema, table), []);
      this.logger.log(`Realtime enabled for ${databaseId}.${schema}.${table}`);
    }

    // Subscribe the platform to the underlying channel (refcounted internally).
    // databaseId is passed so the provider can enrich row-change events with
    // the owning databaseId/projectId (the trigger payload has neither).
    const channel = `db_${schema}_${table}`;
    const sub = await this.notifyProvider.subscribe(channel, databaseId);
    this.channelSubscriptions.set(`${key}:${channel}`, { unsubscribe: sub.unsubscribe });

    // Return the unsubscribe function (decrements refcount, schedules idle disable)
    return async () => {
      const r = this.refcounts.get(key);
      if (!r) return;
      r.count = Math.max(0, r.count - 1);
      if (r.count === 0) {
        // Schedule auto-disable after idle timeout
        r.idleTimer = setTimeout(async () => {
          await this.disableTable(databaseId, schema, table).catch(err =>
            this.logger.warn(`Idle disable failed for ${key}: ${err.message}`));
        }, IDLE_DISABLE_MS);
      }
      const channelSub = this.channelSubscriptions.get(`${key}:${channel}`);
      if (channelSub) await channelSub.unsubscribe();
    };
  }

  /**
   * Manually disable realtime on a table — drops the trigger immediately
   * (regardless of active subscribers).
   */
  async disableTable(databaseId: string, schema: string, table: string): Promise<void> {
    this.validateIdent(schema);
    this.validateIdent(table);
    const key = this.refKey(databaseId, schema, table);
    const ref = this.refcounts.get(key);
    if (ref?.idleTimer) clearTimeout(ref.idleTimer);
    this.refcounts.delete(key);

    await this.queryService.executeParameterized(databaseId, DISABLE_TRIGGER_SQL(table), []);
    this.logger.log(`Realtime disabled for ${databaseId}.${schema}.${table}`);
  }

  /** List all tables with realtime currently active. */
  async listActiveTables(databaseId: string): Promise<{ schema: string; table: string; subscribers: number }[]> {
    const results: { schema: string; table: string; subscribers: number }[] = [];
    for (const [key, ref] of this.refcounts) {
      if (!key.startsWith(`${databaseId}:`)) continue;
      if (ref.count === 0) continue;
      const [, schema, table] = key.split(':');
      results.push({ schema, table, subscribers: ref.count });
    }
    return results;
  }

  /** Check if a table has the realtime trigger installed. */
  async isRealtimeEnabled(databaseId: string, schema: string, table: string): Promise<boolean> {
    try {
      const result = await this.queryService.executeParameterized(
        databaseId,
        `SELECT 1 FROM information_schema.triggers
         WHERE trigger_name = $1
           AND event_object_schema = $2
           AND event_object_table = $3`,
        [`rt_${table}`, schema, table],
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────

  /** Ensure the realtime_notify() pl/pgsql function exists in the database. */
  private async ensureFunction(databaseId: string): Promise<void> {
    // Use CREATE OR REPLACE so this is idempotent. Most Postgres databases
    // have plpgsql available; if not, the CREATE FUNCTION will fail and we
    // surface that to the caller.
    await this.queryService.executeParameterized(databaseId, REALTIME_NOTIFY_FN_SQL, []);
  }

  private refKey(databaseId: string, schema: string, table: string): string {
    return `${databaseId}:${schema}:${table}`;
  }

  private validateIdent(name: string): void {
    if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
      throw new NotFoundException(`Invalid identifier: ${name}`);
    }
  }
}
