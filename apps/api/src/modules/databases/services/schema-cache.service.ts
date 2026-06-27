/**
 * SchemaCacheService — TTL-based cache for schema introspection results.
 *
 * Introspection queries against information_schema are expensive. We cache
 * results for TTL_SECONDS and invalidate on CREATE/ALTER/DROP/migration.
 *
 * Keys are namespaced by (databaseId, queryName) so listTables, getColumns,
 * etc. are cached separately. Per-key TTL — different queries may have
 * different freshness requirements.
 */
import { Injectable, Logger } from '@nestjs/common';

const DEFAULT_TTL_SECONDS = 60;

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

@Injectable()
export class SchemaCacheService {
  private readonly logger = new Logger(SchemaCacheService.name);
  private cache = new Map<string, CacheEntry>();
  // Active TTL per key — set when value is set, expires entries lazily.
  private stats = { hits: 0, misses: 0 };

  /** Get a cached value (or undefined if expired/missing). */
  get<T>(databaseId: string, key: string): T | undefined {
    const full = this.makeKey(databaseId, key);
    const entry = this.cache.get(full);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(full);
      this.stats.misses++;
      return undefined;
    }
    this.stats.hits++;
    return entry.value as T;
  }

  /** Set a value with the default TTL. */
  set(databaseId: string, key: string, value: unknown): void {
    this.setWithTtl(databaseId, key, value, DEFAULT_TTL_SECONDS);
  }

  /** Set a value with a custom TTL in seconds. */
  setWithTtl(databaseId: string, key: string, value: unknown, ttlSeconds: number): void {
    this.cache.set(this.makeKey(databaseId, key), {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /** Invalidate one cache key for a database (after CREATE/ALTER/DROP). */
  invalidate(databaseId: string, key?: string): void {
    if (key) {
      this.cache.delete(this.makeKey(databaseId, key));
    } else {
      // Invalidate all keys for this database
      const prefix = `${databaseId}:`;
      for (const k of this.cache.keys()) {
        if (k.startsWith(prefix)) this.cache.delete(k);
      }
      this.logger.log(`Invalidated schema cache for database ${databaseId}`);
    }
  }

  /** Stats for monitoring. */
  getStats() {
    let active = 0;
    for (const entry of this.cache.values()) {
      if (entry.expiresAt > Date.now()) active++;
    }
    return {
      totalEntries: this.cache.size,
      activeEntries: active,
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }

  private makeKey(databaseId: string, key: string): string {
    return `${databaseId}:${key}`;
  }
}
