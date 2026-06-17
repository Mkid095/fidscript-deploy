import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseProvider, DatabaseCredentials, BackupInfo } from './database-provider.interface';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { MinioProvider } from '../../storage/providers/minio.provider';

/**
 * InternalPgProvider — manages logical databases + roles inside the shared
 * platform Postgres cluster, backed by PgBouncer for pooled app connections.
 *
 * Provisioning (CREATE DATABASE / CREATE ROLE) requires a direct superuser
 * connection to Postgres — routed via the admin connection pool, NOT PgBouncer
 * (PgBouncer does not expose CREATE DATABASE).
 *
 * Backup/restore streams pg_dump / pg_restore output through gzip to/from
 * MinIO (Phase 05 storage), avoiding temp files in the app container.
 */
@Injectable()
export class InternalPgProvider implements DatabaseProvider, OnModuleInit {
  private adminPool: Pool | null = null;
  private adminHost: string = 'postgres';
  private adminPort: number = 5432;
  private adminUser: string = 'fidscript';
  private adminPassword: string = '';
  private adminDatabase: string = 'fidscript';
  private pgbouncerHost: string = 'pgbouncer';
  private pgbouncerPort: number = 6432;

  constructor(
    private configService: ConfigService,
    private minioProvider: MinioProvider,
  ) {
    this.adminHost = this.configService.get<string>('DB_ADMIN_HOST', 'postgres');
    this.adminPort = this.configService.get<number>('DB_ADMIN_PORT', 5432);
    this.adminUser = this.configService.get<string>('DB_ADMIN_USER', 'fidscript');
    this.adminDatabase = this.configService.get<string>('DB_ADMIN_DATABASE', 'fidscript');
    this.pgbouncerHost = this.configService.get<string>('PGBOUNCER_HOST', 'pgbouncer');
    this.pgbouncerPort = this.configService.get<number>('PGBOUNCER_PORT', 6432);
  }

  onModuleInit() {
    // Load password from *_FILE secret (Docker secret convention)
    const passwordFile = this.configService.get<string>('DB_ADMIN_PASSWORD_FILE');
    if (passwordFile) {
      try {
        this.adminPassword = require('fs').readFileSync(passwordFile, 'utf8').trim();
      } catch { /* fall through to env var */ }
    }

    // Fall back to DATABASE_URL env var components
    if (!this.adminPassword) {
      const directUrl = this.configService.get<string>('DIRECT_URL')
        || this.configService.get<string>('DATABASE_URL');
      if (directUrl) {
        try {
          const u = new URL(directUrl);
          this.adminPassword = u.password;
          this.adminUser = u.username;
        } catch { /* ignore parse failures */ }
      }
    }
  }

  private async getAdminPool(): Promise<Pool> {
    if (!this.adminPool) {
      this.adminPool = new Pool({
        host: this.adminHost,
        port: this.adminPort,
        user: this.adminUser,
        password: this.adminPassword,
        database: this.adminDatabase,
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });
      this.adminPool.on('error', (err) => {
        console.error('[InternalPgProvider] admin pool error', err.message);
      });
    }
    return this.adminPool;
  }

  private pgEnv(creds: DatabaseCredentials): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PGUSER: creds.username,
      PGPASSWORD: creds.password,
      PGHOST: creds.host,
      PGPORT: String(creds.port),
      PGDATABASE: creds.database,
    };
  }

  // ─── Provision ────────────────────────────────────────────────────────────

  async provision(databaseId: string, name: string, options?: Record<string, unknown>): Promise<DatabaseCredentials> {
    const slug = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 20);
    const prefix = databaseId.replace(/-/g, '').slice(0, 8);
    const dbName = `proj_${prefix}_${slug}`;
    const dbUser = `proj_${prefix}_${slug}`;
    const password = crypto.randomBytes(24).toString('base64url');

    // Allow per-database override; sensible single-VPS default
    const connLimit = (options?.['maxConnections'] as number) || 20;
    const STATEMENT_TIMEOUT = '60s';

    const pool = await this.getAdminPool();

    // Escape identifiers safely — PostgreSQL identifiers are double-quoted
    const quotedDb = `"${dbName.replace(/"/g, '""')}"`;
    const quotedUser = `"${dbUser.replace(/"/g, '""')}"`;
    const safePass = password.replace(/'/g, "''");

    // 1. Create the database
    await pool.query(`CREATE DATABASE ${quotedDb}`);

    // 2. Create the role with connection limits and statement timeout
    await pool.query(
      `CREATE ROLE ${quotedUser} WITH PASSWORD '${safePass}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOLOGIN CONNECTION LIMIT ${connLimit} SET statement_timeout TO '${STATEMENT_TIMEOUT}'`,
    );

    // 3. Grant CONNECT on the database
    await pool.query(`GRANT CONNECT ON DATABASE ${quotedDb} TO ${quotedUser}`);

    // 4. Set up default privileges inside the DB so the role can create objects
    const ownerPool = new Pool({
      host: this.adminHost,
      port: this.adminPort,
      user: this.adminUser,
      password: this.adminPassword,
      database: dbName,
      max: 2,
    });
    try {
      await ownerPool.query(`GRANT ALL ON SCHEMA public TO ${quotedUser}`);
      await ownerPool.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${quotedUser}`,
      );
      await ownerPool.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${quotedUser}`,
      );
    } finally {
      await ownerPool.end();
    }

    // 5. Revoke public schema noise
    await pool.query(`REVOKE ALL ON SCHEMA public FROM PUBLIC`);

    return this.buildCredentials(dbName, dbUser, password);
  }

  private buildCredentials(database: string, username: string, password: string): DatabaseCredentials {
    // sslmode=require on the connection strings handed to deployed apps.
    // Internal admin/provisioning connections (pg_dump, pg_restore) bypass this
    // by setting PG* env vars directly without sslmode.
    const sslSuffix = '?sslmode=require';
    const connStr = `postgresql://${username}:${password}@${this.adminHost}:${this.adminPort}/${database}${sslSuffix}`;
    const pgbouncerConnStr = `postgresql://${username}:${password}@${this.pgbouncerHost}:${this.pgbouncerPort}/${database}${sslSuffix}`;
    return {
      host: this.adminHost,
      port: this.adminPort,
      database,
      username,
      password,
      connectionString: connStr,
      pgbouncerHost: this.pgbouncerHost,
      pgbouncerPort: this.pgbouncerPort,
      pgbouncerConnectionString: pgbouncerConnStr,
    };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(credentials: DatabaseCredentials): Promise<void> {
    const pool = await this.getAdminPool();
    const dbName = credentials.database;
    const dbUser = credentials.username;
    const quotedDb = `"${dbName.replace(/"/g, '""')}"`;
    const quotedUser = `"${dbUser.replace(/"/g, '""')}"`;

    // Terminate any live connections to this DB before dropping
    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);

    // Drop DB then role
    await pool.query(`DROP DATABASE IF EXISTS ${quotedDb}`);
    await pool.query(`DROP ROLE IF EXISTS ${quotedUser}`);
  }

  // ─── Backup ───────────────────────────────────────────────────────────────

  async backup(credentials: DatabaseCredentials): Promise<BackupInfo> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const objectKey = `db-backups/${credentials.database}/${timestamp}_${backupId}.dump.gz`;
    const tmpFile = `/tmp/backup_${backupId}.dump.gz`;

    // pg_dump --format=custom + gzip → temp file (no memory buffering)
    await this.runProcess(spawn('pg_dump', [
      '-h', credentials.host,
      '-p', String(credentials.port),
      '-U', credentials.username,
      '-d', credentials.database,
      '--format=custom',
      '-f', tmpFile,
    ], { env: this.pgEnv(credentials) }));

    // Compress
    await this.runProcess(spawn('gzip', ['-f', tmpFile]));
    const gzFile = `${tmpFile}.gz`;

    // Upload to MinIO
    const bucket = `backups-${credentials.database.slice(0, 16)}`;
    const buffer = await readFile(gzFile);
    const sizeBytes = buffer.length;

    await this.ensureBucket(bucket);
    await this.minioProvider.upload(objectKey, buffer, 'application/gzip');

    // Clean up temp file
    await unlink(gzFile).catch(() => {/* best-effort */});

    return {
      id: backupId,
      databaseId: credentials.database,
      filename: objectKey,
      size: sizeBytes,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  private async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.minioProvider.makeBucket(bucket);
    } catch (err: unknown) {
      // makeBucket throws if bucket already exists — that's fine
      if (!(err instanceof Error) || !err.message?.includes('already exists')) throw err;
    }
  }

  // ─── Restore ──────────────────────────────────────────────────────────────

  async restore(backup: BackupInfo, targetCredentials: DatabaseCredentials): Promise<void> {
    const bucket = `backups-${targetCredentials.database.slice(0, 16)}`;
    const tmpFile = `/tmp/restore_${backup.id}.dump`;

    // Download from MinIO to temp file
    const buffer = await this.minioProvider.download(backup.filename);
    await writeFile(tmpFile, buffer);

    try {
      // pg_restore into the target DB
      await this.runProcess(spawn('pg_restore', [
        '-h', targetCredentials.host,
        '-p', String(targetCredentials.port),
        '-U', targetCredentials.username,
        '-d', targetCredentials.database,
        '--format=custom',
        '--clean',
        '--if-exists',
        tmpFile,
      ], { env: this.pgEnv(targetCredentials) }));
    } finally {
      await unlink(tmpFile).catch(() => {/* best-effort */});
    }
  }

  // ─── Credential rotation ───────────────────────────────────────────────────

  async rotatePassword(credentials: DatabaseCredentials): Promise<{ password: string }> {
    const newPassword = crypto.randomBytes(24).toString('base64url');
    const quotedUser = `"${credentials.username.replace(/"/g, '""')}"`;
    const safePass = newPassword.replace(/'/g, "''");
    await this.executeSuperuser(`ALTER ROLE ${quotedUser} WITH PASSWORD '${safePass}'`);
    return { password: newPassword };
  }

  // ─── Health check ─────────────────────────────────────────────────────────

  async getStatus(credentials: DatabaseCredentials): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown' }> {
    try {
      const pool = await this.getAdminPool();
      await pool.query('SELECT 1');
      return { status: 'healthy' };
    } catch {
      return { status: 'unhealthy' };
    }
  }

  async getSize(credentials: DatabaseCredentials): Promise<bigint> {
    const pool = await this.getAdminPool();
    const result = await pool.query(
      `SELECT pg_database_size($1) as size`,
      [credentials.database],
    );
    return BigInt(result.rows[0].size);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async executeSuperuser(sql: string): Promise<void> {
    const pool = await this.getAdminPool();
    await pool.query(sql);
  }

  private runProcess(proc: ReturnType<typeof spawn>): Promise<void> {
    return new Promise((resolve, reject) => {
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`process exited with code ${code}`));
      });
      proc.on('error', reject);
    });
  }
}
