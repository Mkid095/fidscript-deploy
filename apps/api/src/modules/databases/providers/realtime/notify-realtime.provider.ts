/**
 * NotifyRealtimeProvider — Postgres LISTEN/NOTIFY based realtime provider.
 *
 * Opens a dedicated pg.Client INSIDE each provisioned database that has enabled
 * realtime, and LISTENs on channel `db_<schema>_<table>` there. When a trigger
 * fires (via the realtime_notify function), it does
 * `pg_notify('db_<schema>_<table>', json_payload)` which is delivered to the
 * client connected to THAT database. We then enrich the payload with
 * databaseId/projectId and fan it out via the EventService
 * → RealtimeBridgeService → WebSocket gateway.
 *
 * IMPORTANT: pg LISTEN/NOTIFY does NOT cross database boundaries. The previous
 * implementation listened on a single connection to the platform `fidscript`
 * database while triggers fired in each provisioned `proj_*` database — so no
 * notification ever arrived. Each provisioned DB needs its own listener.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { EventService } from '@/modules/events/event.service';
import { PrismaService } from '@/prisma/prisma.service';
import { DbPoolService } from '@/modules/databases/services/db-pool.service';
import {
  RealtimeProvider,
  RealtimeSubscription,
  RealtimeEvent,
} from './realtime-provider.interface';

interface DbListener {
  client: Client;
  channels: Set<string>;
}

@Injectable()
export class NotifyRealtimeProvider implements RealtimeProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotifyRealtimeProvider.name);
  /** Per-provisioned-database LISTEN client + the channels it's listening on. */
  private perDbClients = new Map<string, DbListener>();
  /** Refcount per "<databaseId>:<channel>" — many SDK clients may share one. */
  private refCounts = new Map<string, number>();
  /** databaseId → projectId cache (so row-change events carry a projectId). */
  private projectCache = new Map<string, string>();
  private startTime = Date.now();
  private eventsPublished = 0;

  /**
   * A connection to the platform DB — kept only for the `publish()` test helper
   * and as a health signal. LISTEN happens on the per-DB clients, not here.
   */
  private platformClient: Client | null = null;
  private reconnecting = false;

  constructor(
    private config: ConfigService,
    private eventService: EventService,
    private prisma: PrismaService,
    private pools: DbPoolService,
  ) {}

  async onModuleInit() {
    await this.start();
  }

  async start(): Promise<void> {
    // Connect the platform client (publish + health). LISTEN is per-DB.
    if (this.platformClient) return;
    const host = this.config.get<string>('DB_ADMIN_HOST', 'postgres');
    const port = this.config.get<number>('DB_ADMIN_PORT', 5432);
    const user = this.config.get<string>('DB_ADMIN_USER', 'fidscript');
    const database = this.config.get<string>('DB_ADMIN_DATABASE', 'fidscript');

    let password = '';
    const pwFile = this.config.get<string>('DB_ADMIN_PASSWORD_FILE');
    if (pwFile) {
      try { password = (await readFile(pwFile, 'utf8')).trim(); } catch { /* fallback */ }
    }
    if (!password) {
      const directUrl = this.config.get<string>('DIRECT_URL') || this.config.get<string>('DATABASE_URL');
      if (directUrl) { try { password = new URL(directUrl).password; } catch { /* */ } }
    }

    this.platformClient = new Client({ host, port, user, password, database });
    this.platformClient.on('error', (err) => {
      this.logger.error(`Realtime platform client error: ${err.message}`);
      this.scheduleReconnect();
    });
    this.platformClient.on('end', () => {
      this.platformClient = null;
      this.scheduleReconnect();
    });

    try {
      await this.platformClient.connect();
      this.logger.log(`NotifyRealtimeProvider platform client connected (${host}:${port})`);
    } catch (err) {
      this.logger.error(`Failed to connect realtime platform client: ${err instanceof Error ? err.message : err}`);
      this.scheduleReconnect();
    }
  }

  async stop(): Promise<void> {
    for (const databaseId of Array.from(this.perDbClients.keys())) {
      await this.closeClient(databaseId);
    }
    if (this.platformClient) {
      try { await this.platformClient.end(); } catch { /* ignore */ }
      this.platformClient = null;
    }
  }

  async health() {
    return {
      ok: !!this.platformClient || this.perDbClients.size > 0,
      subscriptions: this.refCounts.size,
      lastEventAt: this.eventsPublished > 0 ? new Date().toISOString() : undefined,
    };
  }

  async stats() {
    return {
      activeSubscriptions: this.refCounts.size,
      eventsPublished: this.eventsPublished,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async subscribe(channel: string, databaseId: string): Promise<RealtimeSubscription> {
    const key = `${databaseId}:${channel}`;
    const count = (this.refCounts.get(key) ?? 0) + 1;
    this.refCounts.set(key, count);

    const entry = await this.ensureClient(databaseId);
    if (count === 1 && !entry.channels.has(channel)) {
      await entry.client.query(`LISTEN "${channel}"`);
      entry.channels.add(channel);
      this.logger.log(`Listening on "${channel}" in database ${databaseId}`);
    }

    let active = true;
    const self = this;
    return {
      channel,
      async unsubscribe() {
        if (!active) return;
        active = false;
        const remaining = (self.refCounts.get(key) ?? 1) - 1;
        if (remaining <= 0) {
          self.refCounts.delete(key);
          try { await entry.client.query(`UNLISTEN "${channel}"`); } catch { /* */ }
          entry.channels.delete(channel);
          if (entry.channels.size === 0) await self.closeClient(databaseId);
        } else {
          self.refCounts.set(key, remaining);
        }
      },
    };
  }

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    // Test helper only — production notifications come from trigger functions
    // inside each provisioned database.
    if (this.platformClient) {
      try {
        await this.platformClient.query(`SELECT pg_notify($1, $2)`, [channel, JSON.stringify(event)]);
        this.eventsPublished++;
      } catch (err) {
        this.logger.warn(`pg_notify failed: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────

  /** Open (or reuse) a LISTEN client connected to a provisioned database. */
  private async ensureClient(databaseId: string): Promise<DbListener> {
    const existing = this.perDbClients.get(databaseId);
    if (existing) return existing;

    const client = await this.pools.getClient(databaseId);
    client.on('notification', (msg) =>
      this.handleNotification(databaseId, msg.channel, msg.payload ?? ''),
    );
    client.on('error', (err) =>
      this.logger.error(`Realtime LISTEN client error (db=${databaseId}): ${err.message}`),
    );
    client.on('end', () => {
      this.logger.warn(`Realtime LISTEN client disconnected (db=${databaseId})`);
      this.perDbClients.delete(databaseId);
      for (const k of Array.from(this.refCounts.keys())) {
        if (k.startsWith(`${databaseId}:`)) this.refCounts.delete(k);
      }
    });

    const entry: DbListener = { client, channels: new Set() };
    this.perDbClients.set(databaseId, entry);
    this.logger.log(`Opened realtime LISTEN client for database ${databaseId}`);
    return entry;
  }

  private async closeClient(databaseId: string): Promise<void> {
    const entry = this.perDbClients.get(databaseId);
    if (!entry) return;
    this.perDbClients.delete(databaseId);
    try { await entry.client.end(); } catch { /* ignore */ }
  }

  private async handleNotification(databaseId: string, channel: string, payload: string): Promise<void> {
    try {
      const event: RealtimeEvent = JSON.parse(payload);
      // Enrich with databaseId + projectId. The trigger payload only carries
      // schema/table/row — without projectId the bridge can't route the event
      // to a project room, so it would be silently dropped.
      const projectId = await this.resolveProjectId(databaseId);
      if (!projectId) return;
      this.eventsPublished++;
      await this.eventService.emit('database.row.changed', {
        ...event,
        databaseId,
        projectId,
      } as any);
    } catch (err) {
      this.logger.warn(`Failed to handle realtime payload on "${channel}" (db=${databaseId}): ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Resolve + cache the projectId that owns a databaseId. */
  private async resolveProjectId(databaseId: string): Promise<string | null> {
    const cached = this.projectCache.get(databaseId);
    if (cached) return cached;
    try {
      const db = await this.prisma.managedDatabase.findUnique({
        where: { id: databaseId },
        select: { projectId: true },
      });
      if (db?.projectId) {
        this.projectCache.set(databaseId, db.projectId);
        return db.projectId;
      }
    } catch (err) {
      this.logger.warn(`resolveProjectId(${databaseId}) failed: ${err instanceof Error ? err.message : err}`);
    }
    return null;
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setTimeout(async () => {
      this.reconnecting = false;
      try { await this.start(); } catch { /* start will reschedule */ }
    }, 5_000);
  }

  async onModuleDestroy() {
    await this.stop();
  }
}
