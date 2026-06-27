/**
 * DbMigrationService — schema migration tracking per database.
 *
 * Stores applied migrations in a `schema_migrations` table inside each managed
 * database. Every migration has: id, name, checksum, applied_at, execution_time_ms.
 *
 * This is the foundation for:
 *  - `POST /databases/:id/migrations/apply` — run a migration
 *  - `GET /databases/:id/migrations` — list applied migrations
 *  - Future: `fidscript db push / pull / diff` CLI commands
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DbQueryService } from './db-query.service';
import { SchemaCacheService } from './schema-cache.service';

const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    execution_time_ms INTEGER NOT NULL,
    applied_by TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE
  );
`;

export interface MigrationRecord {
  id: number;
  name: string;
  checksum: string;
  appliedAt: string;
  executionTimeMs: number;
  appliedBy?: string | null;
  success: boolean;
}

export interface ApplyMigrationOptions {
  name?: string;          // human-readable name; auto-generated if omitted
  sql: string;
  appliedBy?: string;
}

@Injectable()
export class DbMigrationService {
  private readonly logger = new Logger(DbMigrationService.name);

  constructor(
    private queryService: DbQueryService,
    private schemaCache: SchemaCacheService,
  ) {}

  /** Ensure the schema_migrations table exists in the database. */
  async ensureMigrationsTable(databaseId: string): Promise<void> {
    await this.queryService.executeParameterized(databaseId, MIGRATIONS_TABLE_SQL, []);
  }

  /**
   * Apply a single migration. Wraps the SQL in a transaction, records it in
   * schema_migrations, and invalidates the schema cache on success.
   */
  async apply(databaseId: string, opts: ApplyMigrationOptions): Promise<MigrationRecord> {
    const name = opts.name || this.generateMigrationName(opts.sql);
    const checksum = this.checksum(opts.sql);
    await this.ensureMigrationsTable(databaseId);

    // Check if this migration was already applied
    const existing = await this.queryService.executeParameterized(
      databaseId,
      `SELECT id, checksum FROM schema_migrations WHERE name = $1`,
      [name],
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].checksum === checksum) {
        throw new BadRequestException(`Migration "${name}" already applied (checksum matches)`);
      }
      throw new BadRequestException(
        `Migration "${name}" already applied with different checksum. Use a new name.`,
      );
    }

    const startTime = Date.now();
    try {
      // Each migration runs as its own transaction (simpler than nested txns)
      await this.queryService.executeParameterized(databaseId, `BEGIN`, []);
      try {
        await this.queryService.executeParameterized(databaseId, opts.sql, []);
        const executionTimeMs = Date.now() - startTime;

        // Record the migration
        await this.queryService.executeParameterized(
          databaseId,
          `INSERT INTO schema_migrations (name, checksum, execution_time_ms, applied_by, success) VALUES ($1, $2, $3, $4, true) RETURNING id, applied_at`,
          [name, checksum, executionTimeMs, opts.appliedBy ?? 'system'],
        );

        await this.queryService.executeParameterized(databaseId, `COMMIT`, []);
        // Invalidate schema cache — schema likely changed
        this.schemaCache.invalidate(databaseId);

        this.logger.log(`Applied migration "${name}" to database ${databaseId} in ${executionTimeMs}ms`);
        return {
          id: 0, // would need to fetch back; left as 0 for now
          name,
          checksum,
          appliedAt: new Date().toISOString(),
          executionTimeMs,
          appliedBy: opts.appliedBy ?? 'system',
          success: true,
        };
      } catch (err) {
        await this.queryService.executeParameterized(databaseId, `ROLLBACK`, []).catch(() => {});
        throw err;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Migration "${name}" failed: ${msg}`);
      throw new BadRequestException(`Migration failed: ${msg}`);
    }
  }

  /** List all applied migrations (newest first). */
  async list(databaseId: string): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable(databaseId);
    const result = await this.queryService.executeParameterized(
      databaseId,
      `SELECT id, name, checksum, applied_at AS "appliedAt", execution_time_ms AS "executionTimeMs",
              applied_by AS "appliedBy", success
       FROM schema_migrations
       ORDER BY applied_at DESC`,
      [],
    );
    return result.rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      checksum: r.checksum,
      appliedAt: typeof r.appliedAt === 'string' ? r.appliedAt : r.appliedAt.toISOString(),
      executionTimeMs: Number(r.executionTimeMs),
      appliedBy: r.appliedBy ?? null,
      success: Boolean(r.success),
    }));
  }

  private checksum(sql: string): string {
    return createHash('sha256').update(sql.trim()).digest('hex').slice(0, 16);
  }

  private generateMigrationName(sql: string): string {
    const ts = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const hash = createHash('sha256').update(sql).digest('hex').slice(0, 8);
    return `auto_${ts}_${hash}`;
  }
}
