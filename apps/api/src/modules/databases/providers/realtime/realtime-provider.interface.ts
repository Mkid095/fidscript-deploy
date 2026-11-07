/**
 * RealtimeProvider — abstraction over how FIDScript listens to database changes.
 *
 * Phase 1: NotifyRealtimeProvider — uses Postgres LISTEN/NOTIFY on a single
 * shared connection. Works for hundreds of databases.
 *
 * Phase 2: WalRealtimeProvider — uses logical replication (pgoutput) for
 * true CDC that captures every change without trigger overhead. Works for
 * thousands+ of databases and high-throughput tables.
 *
 * The SDK never changes when swapping providers.
 */
export interface RealtimeSubscription {
  /** Channel name, e.g. `db_<databaseId>` or `db_<databaseId>:users`. */
  channel: string;
  /** Unsubscribe and release resources. */
  unsubscribe(): Promise<void>;
}

export interface RealtimeEvent {
  version: 1;
  organizationId?: string;
  projectId: string;
  environmentId?: string;
  databaseId: string;
  schema: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  /** Row after the change. Null on DELETE. */
  new: Record<string, any> | null;
  /** Row before the change. Null on INSERT. */
  old: Record<string, any> | null;
  timestamp: string;
  /** Optional reference to the originating transaction. */
  xid?: number;
}

export interface RealtimeProvider {
  /** Lifecycle. */
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<{ ok: boolean; subscriptions: number; lastEventAt?: string }>;

  /**
   * Subscribe to a channel. Called per-database by ChannelManager (NOT per
   * per-SDK-client). Returns a subscription with .unsubscribe() that releases
   * the underlying pg LISTEN refcount.
   *
   * `databaseId` is required so the provider can enrich row-change events with
   * the owning databaseId/projectId — the trigger payload only carries
   * schema/table/row, so without this the bridge can't route events to a
   * project room.
   */
  subscribe(channel: string, databaseId: string): Promise<RealtimeSubscription>;

  /**
   * Publish an event to a channel. Used by the trigger function (via the
   * realtime_notify pl/pgsql function).
   */
  publish(channel: string, event: RealtimeEvent): Promise<void>;

  /** Stats for monitoring. */
  stats(): Promise<{
    activeSubscriptions: number;
    eventsPublished: number;
    uptime: number;
  }>;
}
