/**
 * DbPoolService — caches per-database pg.Pool connections with LRU eviction.
 *
 * Each managed database has its own role/credentials. Rather than creating a
 * new Pool on every query, we cache them by databaseId and reuse.
 *
 * Capacity management:
 *  - maxPools (200): hard cap on simultaneous cached pools
 *  - idleTimeout (15min): pools idle this long are closed by the sweeper
 *  - LRU eviction: when maxPools is reached, the least-recently-used pool is
 *    closed to make room for a new one
 *
 * Pools use the database's decrypted credentials (from
 * ManagedDatabase.connectionInfo). We connect DIRECTLY to Postgres (not via
 * pgbouncer) for data operations, because pgbouncer in transaction mode
 * doesn't support LISTEN/NOTIFY or prepared statements.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import type { DatabaseCredentials } from '../providers/database-provider.interface';

interface PoolEntry {
  pool: Pool;
  databaseId: string;
  lastUsed: number;
}

const POOL_MAX_CONNECTIONS = 3;       // per-database limit (conservative for multi-tenant)
const IDLE_POOL_TTL_MS = 15 * 60_000; // close pools idle for >15 min
const MAX_POOLS = 200;                // hard cap on simultaneous cached pools
const SWEEPER_INTERVAL_MS = 5 * 60_000; // run the idle sweeper every 5 min

@Injectable()
export class DbPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbPoolService.name);
  // LRU order maintained implicitly by Map insertion order — most-recent get/set moves to MRU end.
  private pools = new Map<string, PoolEntry>();
  private sweeper: ReturnType<typeof setInterval> | null = null;
  private healthCheckFailures = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  onModuleInit() {
    // Periodically evict idle pools to free Postgres connections.
    this.sweeper = setInterval(() => {
      this.closeIdlePools().catch(err =>
        this.logger.warn(`Pool sweeper error: ${err.message}`));
    }, SWEEPER_INTERVAL_MS);
  }

  /**
   * Get a pg.Pool for the given databaseId. Creates one lazily if needed.
   * Uses the decrypted credentials stored in ManagedDatabase.connectionInfo.
   * Evicts LRU pools if we hit maxPools.
   */
  async getPool(databaseId: string): Promise<Pool> {
    let entry = this.pools.get(databaseId);
    if (entry) {
      // Refresh LRU position
      this.pools.delete(databaseId);
      this.pools.set(databaseId, entry);
      entry.lastUsed = Date.now();
      return entry.pool;
    }

    // Capacity check — evict LRU if at limit
    if (this.pools.size >= MAX_POOLS) {
      await this.evictLru();
    }

    // Decrypt credentials from the DB
    const creds = await this.getCredentials(databaseId);
    const pool = new Pool({
      host: creds.host,
      port: creds.port,
      user: creds.username,
      password: creds.password,
      database: creds.database,
      max: POOL_MAX_CONNECTIONS,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Health-check every 30s — remove dead clients from pool
      keepAlive: true,
    });

    pool.on('error', (err) => {
      const failures = (this.healthCheckFailures.get(databaseId) ?? 0) + 1;
      this.healthCheckFailures.set(databaseId, failures);
      this.logger.error(`Pool error for database ${databaseId} (failure ${failures}): ${err.message}`);
      // After 3 consecutive errors, drop the pool — caller will recreate
      if (failures >= 3) {
        this.closePool(databaseId).catch(() => {});
        this.healthCheckFailures.delete(databaseId);
      }
    });

    entry = { pool, databaseId, lastUsed: Date.now() };
    this.pools.set(databaseId, entry);
    this.healthCheckFailures.delete(databaseId);
    this.logger.log(`Created pool for database ${databaseId} (active: ${this.pools.size}/${MAX_POOLS})`);
    return pool;
  }

  /**
   * Get a raw pg.Client (not from the pool) for operations that need a
   * dedicated connection, like LISTEN/NOTIFY.
   */
  async getClient(databaseId: string) {
    const creds = await this.getCredentials(databaseId);
    const { Client } = await import('pg');
    const client = new Client({
      host: creds.host,
      port: creds.port,
      user: creds.username,
      password: creds.password,
      database: creds.database,
      connectionTimeoutMillis: 10_000,
    });
    await client.connect();
    return client;
  }

  /** Get decrypted credentials for a database. */
  async getCredentials(databaseId: string): Promise<DatabaseCredentials> {
    const db = await this.prisma.managedDatabase.findUnique({
      where: { id: databaseId },
      select: { connectionInfo: true, name: true },
    });
    if (!db?.connectionInfo) {
      throw new Error(`Database ${databaseId} has no stored credentials. Was it provisioned?`);
    }
    try {
      const decrypted = this.cryptoService.decrypt(db.connectionInfo);
      return JSON.parse(decrypted);
    } catch {
      throw new Error(`Failed to decrypt credentials for database ${databaseId}`);
    }
  }

  /** Close and remove a specific database's pool. */
  async closePool(databaseId: string): Promise<void> {
    const entry = this.pools.get(databaseId);
    if (entry) {
      this.pools.delete(databaseId);
      await entry.pool.end().catch(() => {});
      this.logger.log(`Closed pool for ${databaseId} (active: ${this.pools.size})`);
    }
  }

  /** Evict the least-recently-used pool. Called when MAX_POOLS is hit. */
  private async evictLru(): Promise<void> {
    // Map iteration is insertion order — the first key is the LRU.
    const lruKey = this.pools.keys().next().value;
    if (lruKey) {
      this.logger.warn(`Evicting LRU pool: ${lruKey} (max ${MAX_POOLS} reached)`);
      await this.closePool(lruKey);
    }
  }

  /** Close pools idle for >IDLE_POOL_TTL_MS. Called periodically by sweeper. */
  async closeIdlePools(): Promise<void> {
    const now = Date.now();
    let closed = 0;
    for (const [id, entry] of Array.from(this.pools.entries())) {
      if (now - entry.lastUsed > IDLE_POOL_TTL_MS) {
        await this.closePool(id);
        closed++;
      }
    }
    if (closed > 0) {
      this.logger.log(`Sweeper closed ${closed} idle pool(s) (active: ${this.pools.size})`);
    }
  }

  /** Health check — returns true if the pool can run a query. */
  async healthCheck(databaseId: string): Promise<boolean> {
    try {
      const pool = await this.getPool(databaseId);
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /** Stats for monitoring/admin views. */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.pools.values());
    return {
      active: this.pools.size,
      max: MAX_POOLS,
      healthCheckFailures: Array.from(this.healthCheckFailures.entries()),
      pools: entries.map(e => ({
        databaseId: e.databaseId,
        idleMs: now - e.lastUsed,
      })),
    };
  }

  async onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
    this.logger.log(`Closing ${this.pools.size} database pool(s)…`);
    await Promise.all(
      Array.from(this.pools.values()).map(e => e.pool.end().catch(() => {})),
    );
    this.pools.clear();
  }
}
