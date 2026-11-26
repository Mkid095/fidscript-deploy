/**
 * PlatformBackupService — automated platform-wide backup.
 *
 * Backs up PostgreSQL (pg_dump → gzip → AES-256-GCM) and a JSON manifest
 * of all platform entities (projects, cron jobs, domains, users, orgs,
 * deployments, credentials). Stored encrypted, with retention enforced on
 * every run (default 30 days, configurable).
 *
 * The destination is the platform's own MinIO by default — same server,
 * no configuration. A platform admin can point it at any S3-compatible
 * store (Wasabi, Backblaze, R2, another MinIO) and the next backup lands
 * there; the configuration lives encrypted in a platform-level Secret row.
 *
 * `verifyLatestBackup` is the answer to "does this archive actually
 * restore": it decrypts the newest dump into a scratch database, restores
 * it, counts the rows of every table the manifest promised, and drops the
 * scratch database again. A backup that cannot be restored is a backup
 * that does not exist.
 *
 * Telegram notifications on success/failure (if TELEGRAM_BOT_TOKEN +
 * TELEGRAM_CHAT_ID set).
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import { readFile, unlink, writeFile } from 'fs/promises';
import { Pool } from 'pg';
import { PrismaService } from '@/prisma/prisma.service';
import { MinioProvider } from '@/modules/storage/providers/minio.provider';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { PostgresAdminService } from '@/modules/databases/providers/postgres-admin.service';
import { RedisService } from '@/modules/redis/redis.service';
import { SecretsService } from '@/modules/infrastructure/secrets/secrets.service';
import {
  BackupStore,
  InternalMinioStore,
  S3Store,
  buildS3Store,
  S3DestinationConfig,
} from './backup-store';

export type { S3DestinationConfig } from './backup-store';

const BACKUP_BUCKET = 'backups-platform';
const PLATFORM_BACKUP_LOCK = 'platform-backup:lock';
const LOCK_TOKEN = 'platform-backup-token';
const LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Where the destination's configuration lives: a platform-level Secret
 * row (projectId null), encrypted like every secret.
 */
export const BACKUP_DESTINATION_KEY = 'platform-backup-destination';
export const BACKUP_EVENTS_KEY = 'platform-backup-events';

/**
 * How many rows of each entity the backup carries — what a restore
 * verification compares the restored database against.
 */
export interface BackupManifest {
  version: 1;
  platformVersion: string;
  createdAt: string;
  backupId: string;
  postgresFile: string;
  postgresSize: number;
  manifestFile: string;
  manifestSize: number;
  checksum: string;
  retentionDays: number;
  components: string[];
  tableCounts?: Record<string, number>;
}

export interface BackupResult {
  backupId: string;
  manifest: BackupManifest;
  filesStored: number;
  bytesStored: number;
  destination: { kind: 'internal' | 's3'; description: string };
}

export interface RestoreVerifyResult {
  ok: boolean;
  backupId: string | null;
  backupCreatedAt: string | null;
  scratchDatabase: string | null;
  checkedAt: string;
  /** False when the manifest predates table counts — the dump still restored. */
  countsVerified: boolean;
  mismatches: Record<string, { expected: number; actual: number }>;
  error?: string;
}

export interface BackupEvent {
  checkedAt: string;
  ok: boolean;
  backupId: string | null;
  kind: 'verify';
  error?: string;
  mismatchCount?: number;
}

/**
 * The manifest's entity keys → the table a count runs against, exactly as
 * the schemas name them. A key with no mapping here is simply not counted.
 */
const COUNT_QUERIES: Record<string, string> = {
  projects: 'SELECT count(*) FROM "projects"."projects"',
  cronJobs: 'SELECT count(*) FROM "scheduler"."cron_jobs"',
  domains: 'SELECT count(*) FROM "projects"."domains"',
  users: 'SELECT count(*) FROM "identity"."users"',
  organizations: 'SELECT count(*) FROM "identity"."organizations"',
  deployments: 'SELECT count(*) FROM "projects"."deployments"',
  credentials: 'SELECT count(*) FROM "infrastructure"."credentials"',
};

@Injectable()
export class PlatformBackupService {
  private readonly logger = new Logger(PlatformBackupService.name);
  private readonly retentionDays: number;
  private readonly telegramBotToken: string | null;
  private readonly telegramChatId: string | null;

  constructor(
    private prisma: PrismaService,
    private minio: MinioProvider,
    private cryptoService: CryptoService,
    private admin: PostgresAdminService,
    private redis: RedisService,
    private config: ConfigService,
    private secrets: SecretsService,
  ) {
    this.retentionDays = this.config.get<number>('PLATFORM_BACKUP_RETENTION_DAYS', 30);
    this.telegramBotToken = this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? null;
    this.telegramChatId = this.config.get<string>('TELEGRAM_CHAT_ID') ?? null;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Run a full platform backup. Skips if another backup is already running. */
  async runBackup(): Promise<BackupResult | null> {
    const acquired = await this.redis.acquireLock(PLATFORM_BACKUP_LOCK, LOCK_TOKEN, LOCK_TTL_MS);
    if (!acquired) {
      this.logger.warn('[backup] Another backup is running, skipping');
      return null;
    }

    const store = await this.resolveStore();
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pgFile = `/tmp/${backupId}.dump`; // pg_dump writes here; gzip adds .gz

    try {
      this.logger.log(`[backup] Starting backup ${backupId} → ${store.description}`);

      // 1. pg_dump → /tmp/<id>.dump then gzip → /tmp/<id>.dump.gz
      await this.runPgDump(pgFile);
      const pgGzFile = `${pgFile}.gz`;

      // 2. Build JSON manifest
      const { buffer: manifestData, tableCounts } = await this.buildManifestJson(backupId);

      // 3. Encrypt
      const encPg = await this.encryptLargeFile(pgGzFile);
      const encManifest = this.encryptManifest(manifestData);

      // 4. SHA256 of encrypted manifest for verification
      const checksum = crypto.createHash('sha256').update(encManifest).digest('hex');

      // 5. Upload to the destination
      const pgKey = `postgres/${timestamp}_${backupId}.dump.gz.enc`;
      const manifestKey = `manifests/${timestamp}_${backupId}.json.enc`;
      await store.makeBucket();
      await store.upload(pgKey, encPg);
      await store.upload(manifestKey, encManifest);

      const manifest: BackupManifest = {
        version: 1,
        platformVersion: await this.getSchemaVersion(),
        createdAt: new Date().toISOString(),
        backupId,
        postgresFile: pgKey,
        postgresSize: encPg.length,
        manifestFile: manifestKey,
        manifestSize: encManifest.length,
        checksum,
        retentionDays: this.retentionDays,
        components: ['postgres', 'manifest'],
        tableCounts,
      };

      // 6. Enforce retention, where the backups live
      const deleted = await this.enforceRetention(store);

      // 7. Cleanup
      await unlink(pgGzFile).catch(() => {/* best-effort */});

      this.logger.log(
        `[backup] Done backupId=${backupId} pg=${encPg.length} manifest=${encManifest.length} deletedOld=${deleted}`,
      );

      await this.notifySuccess(backupId, encPg.length + encManifest.length, deleted);

      return { backupId, manifest, filesStored: 2, bytesStored: encPg.length + encManifest.length, destination: { kind: store.kind, description: store.description } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[backup] Failed ${backupId}: ${msg}`);
      await this.notifyFailure(backupId, msg);
      throw err;
    } finally {
      await this.redis.releaseLock(PLATFORM_BACKUP_LOCK, LOCK_TOKEN);
    }
  }

  // ─── Destination ────────────────────────────────────────────────────────────

  /**
   * The destination the next backup lands in: the admin-configured
   * S3-compatible store when one is set and whole, the platform's own
   * MinIO otherwise. A half-saved configuration must not stop the
   * nightly backup running.
   */
  async resolveStore(): Promise<BackupStore> {
    const raw = await this.secrets.tryGet(null, BACKUP_DESTINATION_KEY);
    if (raw) {
      const s3 = buildS3Store(raw);
      if (s3) return s3;
      this.logger.warn('[backup] The backup destination is misconfigured; using the internal store');
    }
    return new InternalMinioStore(this.minio);
  }

  /** Test a destination before it is saved. */
  async testDestination(cfg: S3DestinationConfig): Promise<{ ok: boolean; detail?: string; error?: string }> {
    return new S3Store(cfg).testConnection();
  }

  /** Save a destination: it is only written once it answered the probe. */
  async setDestination(cfg: S3DestinationConfig): Promise<void> {
    const probe = await this.testDestination(cfg);
    if (!probe.ok) throw new BadRequestException(probe.error ?? 'The destination could not be reached.');
    await this.secrets.set(null, BACKUP_DESTINATION_KEY, JSON.stringify(cfg), {
      provider: 's3',
      metadata: { endpoint: cfg.endpoint, bucket: cfg.bucket },
    });
  }

  /** Back to the platform's own MinIO. */
  async clearDestination(): Promise<void> {
    await this.secrets.delete(null, BACKUP_DESTINATION_KEY);
  }

  // ─── Restore verification ───────────────────────────────────────────────────

  /**
   * Prove the newest backup actually restores.
   *
   * Download → decrypt the dump → create a scratch database on the same
   * Postgres → pg_restore into it → count the rows of every table the
   * manifest promised → drop the scratch database. The counts are the
   * proof: a dump that restores but loses rows is not a backup.
   */
  async verifyLatestBackup(): Promise<RestoreVerifyResult> {
    const checkedAt = new Date().toISOString();
    const base: RestoreVerifyResult = {
      ok: false, backupId: null, backupCreatedAt: null, scratchDatabase: null,
      checkedAt, countsVerified: false, mismatches: {},
    };

    const store = await this.resolveStore();
    const manifests = await this.listBackupsInternal(store);
    const latest = manifests[0];
    if (!latest) {
      const result = { ...base, error: 'No backup to verify — run one first.' };
      await this.recordEvent(result);
      return result;
    }

    const scratch = `fidscript_restore_${latest.backupId.slice(0, 12)}`;
    const tmpGz = `/tmp/verify_${latest.backupId}.dump.gz`;
    const tmpDump = `/tmp/verify_${latest.backupId}.dump`;
    let pool: Pool | null = null;
    let scratchCreated = false;

    try {
      const admin = this.adminCreds();

      // 1. The dump, decrypted and ungzipped, is a pg_restore custom file.
      const enc = await store.download(latest.postgresFile);
      const gz = this.decryptLargeBuffer(enc);
      await writeFile(tmpGz, gz);
      await this.execProcess(spawn('gunzip', ['-f', tmpGz]));

      // 2. A scratch database in the same cluster — it never touches the
      //    live data, and it is dropped in `finally` no matter what.
      await this.admin.execute(`CREATE DATABASE "${scratch}"`);
      scratchCreated = true;

      // 3. Restore into it, the same way a customer's database restores.
      await this.execProcess(spawn('pg_restore', [
        '-h', admin.host,
        '-p', String(admin.port),
        '-U', admin.username,
        '-d', scratch,
        '--format=custom',
        '--clean',
        '--if-exists',
        tmpDump,
      ], { env: this.admin.pgEnv({ ...admin, database: scratch }) }));

      // 4. The proof: what the manifest promised, and what is there.
      // The pool must be open for the counts, and closed before the DROP.
      pool = new Pool({
        host: admin.host, port: admin.port, user: admin.username,
        password: admin.password, database: scratch, max: 2,
      });
      const mismatches: Record<string, { expected: number; actual: number }> = {};
      if (latest.tableCounts) {
        for (const [key, expected] of Object.entries(latest.tableCounts)) {
          const query = COUNT_QUERIES[key];
          if (!query) continue; // a newer entity the count table does not know
          const row = await pool.query<{ count: string }>(query);
          const actual = Number(row.rows[0]?.count ?? 0);
          if (actual !== expected) mismatches[key] = { expected, actual };
        }
      }
      pool.end();
      pool = null;
      const countsVerified = Boolean(latest.tableCounts);
      // "Verified" means verified in full: a dump that restores but cannot
      // be counted is not yet proved to be complete.
      const ok = countsVerified && Object.keys(mismatches).length === 0;

      // 5. Record it.
      const result: RestoreVerifyResult = {
        ...base,
        ok,
        backupId: latest.backupId,
        backupCreatedAt: latest.createdAt,
        scratchDatabase: scratch,
        countsVerified,
        mismatches,
        error: ok
          ? undefined
          : countsVerified
            ? `${Object.keys(mismatches).length} table count(s) do not match the manifest`
            : 'The dump restored, but this manifest predates row counts — nothing to compare against.',
      };
      await this.recordEvent(result);
      if (!ok) await this.notifyVerifyFailure(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const result = {
        ...base,
        backupId: latest.backupId,
        backupCreatedAt: latest.createdAt,
        scratchDatabase: scratch,
        error: msg,
      };
      await this.recordEvent(result);
      this.logger.error(`[backup-verify] ${latest.backupId}: ${msg}`);
      await this.notifyVerifyFailure(result);
      return result;
    } finally {
      if (pool) {
        await pool.end().catch(() => {});
      }
      // The scratch database goes away either way — awaited so the method
      // does not report success while a database it created is still up.
      await this.admin.execute(`DROP DATABASE IF EXISTS "${scratch}"`).catch((err: unknown) => {
        this.logger.warn(`[backup-verify] Could not drop scratch DB ${scratch}: ${err instanceof Error ? err.message : String(err)}`);
      });
      await unlink(tmpGz).catch(() => {/* gone if gunzip succeeded */});
      await unlink(tmpDump).catch(() => {/* best-effort */});
    }
  }

  /** The most recent verification events, newest first. */
  async listVerifyEvents(): Promise<BackupEvent[]> {
    const raw = await this.secrets.tryGet(null, BACKUP_EVENTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as BackupEvent[];
    } catch {
      return [];
    }
  }

  /** What the console's card reports: the destination, the last backup, the last check. */
  async getBackupStatus() {
    const store = await this.resolveStore();
    const [manifests, events] = await Promise.all([
      this.listBackupsInternal(store),
      this.listVerifyEvents(),
    ]);
    const configured = await this.secrets.tryGet(null, BACKUP_DESTINATION_KEY);
    return {
      destination: {
        kind: store.kind,
        description: store.description,
        configured: Boolean(configured && buildS3Store(configured)),
      },
      retentionDays: this.retentionDays,
      lastBackup: manifests[0]
        ? {
            backupId: manifests[0].backupId,
            createdAt: manifests[0].createdAt,
            postgresSize: manifests[0].postgresSize,
            manifestSize: manifests[0].manifestSize,
            tableCounts: manifests[0].tableCounts,
          }
        : null,
      lastVerify: events[0] ?? null,
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /** The admin's own credentials — the scratch database lives on the cluster it already runs. */
  private adminCreds() {
    const adminAny = this.admin as unknown as Record<string, unknown>;
    return {
      host: adminAny.adminHost as string,
      port: Number(adminAny.adminPort),
      username: adminAny.adminUser as string,
      password: adminAny.adminPassword as string,
      database: adminAny.adminDatabase as string,
    };
  }

  private async recordEvent(result: RestoreVerifyResult): Promise<void> {
    const events = await this.listVerifyEvents();
    events.unshift({
      checkedAt: result.checkedAt,
      ok: result.ok,
      backupId: result.backupId,
      kind: 'verify',
      error: result.error,
      mismatchCount: Object.keys(result.mismatches).length || undefined,
    });
    // A bounded log: the last twenty checks are what a person will read.
    await this.secrets.set(null, BACKUP_EVENTS_KEY, JSON.stringify(events.slice(0, 20)));
  }

  private async runPgDump(outputFile: string): Promise<void> {
    const admin = this.adminCreds();
    const env = this.admin.pgEnv({ ...admin, database: admin.database });
    await this.execProcess(spawn('pg_dump', [
      '-h', admin.host,
      '-p', String(admin.port),
      '-U', admin.username,
      '-d', admin.database,
      '--format=custom',
      '-f', outputFile,
    ], { env }));
    // gzip the output file in-place: outputFile → outputFile.gz
    await this.execProcess(spawn('gzip', ['-f', outputFile]));
  }

  private async buildManifestJson(
    backupId: string,
  ): Promise<{ buffer: Buffer; tableCounts: Record<string, number> }> {
    const [projects, cronJobs, domains, users, orgs, deployments, credentials] = await Promise.all([
      this.prisma.project.findMany({
        select: { id: true, name: true, slug: true, type: true, status: true, ownerId: true, region: true, subdomain: true, customDomains: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.cronJob.findMany({
        select: { id: true, projectId: true, name: true, cronExpression: true, timezone: true, actionType: true, enabled: true, retryAttempts: true, nextRunAt: true, lastRunAt: true, createdAt: true },
      }),
      this.prisma.domain.findMany({
        select: { id: true, projectId: true, domain: true, isCustom: true, dnsStatus: true, healthStatus: true, createdAt: true },
      }),
      this.prisma.user.findMany({
        select: { id: true, email: true, role: true, mfaEnabled: true, createdAt: true },
      }),
      this.prisma.organization.findMany({
        select: { id: true, name: true, slug: true, plan: true, createdAt: true },
      }),
      this.prisma.deployment.findMany({
        select: {
          id: true, projectId: true, status: true,
          deploymentUrl: true, createdAt: true, completedAt: true,
          release: { select: { commitSha: true, branch: true, imageTag: true } },
        },
      }),
      this.prisma.credential.findMany({
        select: { id: true, projectId: true, type: true, name: true, keyPrefix: true, scopes: true, createdAt: true },
      }),
    ]);

    const manifest = {
      backupId, createdAt: new Date().toISOString(), version: 1,
      retentionDays: this.retentionDays,
      projects, cronJobs, domains, users, organizations: orgs, deployments, credentials,
      // What a restore verification compares against: how many rows of each
      // entity this backup carries.
      tableCounts: {
        projects: projects.length,
        cronJobs: cronJobs.length,
        domains: domains.length,
        users: users.length,
        organizations: orgs.length,
        deployments: deployments.length,
        credentials: credentials.length,
      },
    };

    return {
      buffer: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
      tableCounts: manifest.tableCounts,
    };
  }

  /**
   * Encrypt a large file using AES-256-GCM with a random salt.
   * Format: salt(32) || iv(12) || authTag(16) || ciphertext
   */
  private async encryptLargeFile(filePath: string): Promise<Buffer> {
    const data = await readFile(filePath);
    const rawKey = (this.cryptoService as unknown as { key: Buffer }).key;
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(rawKey, salt, 100_000, 32, 'sha512');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, authTag, encrypted]);
  }

  /** The inverse of encryptLargeFile — what a restore reads back. */
  private decryptLargeBuffer(data: Buffer): Buffer {
    const rawKey = (this.cryptoService as unknown as { key: Buffer }).key;
    const salt = data.subarray(0, 32);
    const iv = data.subarray(32, 44);
    const authTag = data.subarray(44, 60);
    const ciphertext = data.subarray(60);
    const key = crypto.pbkdf2Sync(rawKey, salt, 100_000, 32, 'sha512');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /** Encrypt JSON manifest using CryptoService (AES-256-GCM with iv:authTag:ciphertext format). */
  private encryptManifest(data: Buffer): Buffer {
    return Buffer.from(this.cryptoService.encrypt(data.toString('utf8')), 'utf8');
  }

  private async enforceRetention(store: BackupStore): Promise<number> {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const backups = await this.listBackupsInternal(store);
    let deleted = 0;
    for (const backup of backups) {
      if (new Date(backup.createdAt) < cutoff) {
        try {
          await store.delete(backup.postgresFile);
          await store.delete(backup.manifestFile);
          deleted++;
        } catch { /* best-effort */ }
      }
    }
    return deleted;
  }

  private async listBackupsInternal(store: BackupStore): Promise<BackupManifest[]> {
    const backups: BackupManifest[] = [];
    try {
      const keys = await store.list('manifests/');
      for (const key of keys) {
        try {
          const data = await store.download(key);
          // The manifest is stored encrypted (see encryptManifest); the
          // bytes on the wire are not the JSON. Decrypt, then parse — the
          // old code parsed the ciphertext, threw, swallowed it, and
          // retention deleted nothing.
          const plain = this.cryptoService.decrypt(data.toString('utf8'));
          backups.push(JSON.parse(plain));
        } catch { /* corrupt or unreadable — skip */ }
      }
    } catch { /* no destination reachable — nothing to list */ }
    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private async getSchemaVersion(): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw<{ ver: string }[]>`SELECT MAX(version) as ver FROM "_prisma_migrations"`;
      return result[0]?.ver ?? 'unknown';
    } catch { return 'unknown'; }
  }

  private async notifySuccess(id: string, bytes: number, deleted: number): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) return;
    const MB = (bytes / 1024 / 1024).toFixed(1);
    await this.sendTelegram(
      `✅ Platform backup complete\nID: \`${id}\`\nSize: ${MB} MB\n` +
      `Old backups pruned: ${deleted}\nRetention: ${this.retentionDays} days`,
    );
  }

  private async notifyFailure(id: string, error: string): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) return;
    await this.sendTelegram(
      `🚨 Platform backup FAILED\nID: \`${id}\`\nError: ${error.slice(0, 200)}`,
    );
  }

  private async notifyVerifyFailure(result: RestoreVerifyResult): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) return;
    await this.sendTelegram(
      `🚨 Platform backup VERIFY FAILED\nBackup: \`${result.backupId ?? 'none'}\`\n` +
      `${result.error ?? 'unknown error'}`,
    );
  }

  private async sendTelegram(text: string): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.telegramChatId, text, parse_mode: 'Markdown' }),
      });
    } catch (err) {
      this.logger.warn(`Telegram notification failed: ${(err as Error).message}`);
    }
  }

  private execProcess(proc: ReturnType<typeof spawn>): Promise<void> {
    return new Promise((resolve, reject) => {
      proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
      proc.on('error', reject);
    });
  }
}
