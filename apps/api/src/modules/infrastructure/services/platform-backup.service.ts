/**
 * PlatformBackupService — automated platform-wide backup.
 *
 * Backs up PostgreSQL (pg_dump → gzip → AES-256-GCM) and a JSON manifest
 * of all platform entities (projects, cron jobs, domains, users, orgs,
 * deployments, credentials). Stored encrypted in MinIO under `backups-platform/`.
 *
 * Retention enforced on every run (default 30 days, configurable).
 * Telegram notifications on success/failure (if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID set).
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import { readFile, unlink } from 'fs/promises';
import { PrismaService } from '@/prisma/prisma.service';
import { MinioProvider } from '@/modules/storage/providers/minio.provider';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { PostgresAdminService } from '@/modules/databases/providers/postgres-admin.service';
import { RedisService } from '@/modules/redis/redis.service';

const BACKUP_BUCKET = 'backups-platform';
const PLATFORM_BACKUP_LOCK = 'platform-backup:lock';
const LOCK_TOKEN = 'platform-backup-token';
const LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
}

export interface BackupResult {
  backupId: string;
  manifest: BackupManifest;
  filesStored: number;
  bytesStored: number;
}

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

    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pgFile = `/tmp/${backupId}.dump`; // pg_dump writes here; gzip adds .gz

    try {
      this.logger.log(`[backup] Starting backup ${backupId}`);

      // 1. pg_dump → /tmp/<id>.dump then gzip → /tmp/<id>.dump.gz
      await this.runPgDump(pgFile);
      const pgGzFile = `${pgFile}.gz`;

      // 2. Build JSON manifest
      const manifestData = await this.buildManifestJson(backupId);

      // 3. Encrypt
      const encPg = await this.encryptLargeFile(pgGzFile);
      const encManifest = this.encryptManifest(manifestData);

      // 4. SHA256 of encrypted manifest for verification
      const checksum = crypto.createHash('sha256').update(encManifest).digest('hex');

      // 5. Upload to MinIO
      const pgKey = `postgres/${timestamp}_${backupId}.dump.gz.enc`;
      const manifestKey = `manifests/${timestamp}_${backupId}.json.enc`;
      await this.ensureBucket();
      await this.minio.upload(pgKey, encPg, 'application/octet-stream', undefined, BACKUP_BUCKET);
      await this.minio.upload(manifestKey, encManifest, 'application/octet-stream', undefined, BACKUP_BUCKET);

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
      };

      // 6. Enforce retention
      const deleted = await this.enforceRetention();

      // 7. Cleanup
      await unlink(pgGzFile).catch(() => {/* best-effort */});

      this.logger.log(
        `[backup] Done backupId=${backupId} pg=${encPg.length} manifest=${encManifest.length} deletedOld=${deleted}`,
      );

      await this.notifySuccess(backupId, encPg.length + encManifest.length, deleted);

      return { backupId, manifest, filesStored: 2, bytesStored: encPg.length + encManifest.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[backup] Failed ${backupId}: ${msg}`);
      await this.notifyFailure(backupId, msg);
      throw err;
    } finally {
      await this.redis.releaseLock(PLATFORM_BACKUP_LOCK, LOCK_TOKEN);
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async runPgDump(outputFile: string): Promise<void> {
    const adminAny = this.admin as unknown as Record<string, string>;
    const env = this.admin.pgEnv({
      host: adminAny.adminHost,
      port: Number(adminAny.adminPort),
      database: adminAny.adminDatabase,
      username: adminAny.adminUser,
      password: adminAny.adminPassword,
    });
    await this.execProcess(spawn('pg_dump', [
      '-h', env.PGHOST!,
      '-p', env.PGPORT!,
      '-U', env.PGUSER!,
      '-d', env.PGDATABASE!,
      '--format=custom',
      '-f', outputFile,
    ], { env }));
    // gzip the output file in-place: outputFile → outputFile.gz
    await this.execProcess(spawn('gzip', ['-f', outputFile]));
  }

  private async buildManifestJson(backupId: string): Promise<Buffer> {
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
    };

    return Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
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

  /** Encrypt JSON manifest using CryptoService (AES-256-GCM with iv:authTag:ciphertext format). */
  private encryptManifest(data: Buffer): Buffer {
    return Buffer.from(this.cryptoService.encrypt(data.toString('utf8')), 'utf8');
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.minio.makeBucket(BACKUP_BUCKET);
    } catch (err: unknown) {
      if (!(err instanceof Error) || !err.message?.includes('already exists')) throw err;
    }
  }

  private async enforceRetention(): Promise<number> {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const backups = await this.listBackupsInternal();
    let deleted = 0;
    for (const backup of backups) {
      if (new Date(backup.createdAt) < cutoff) {
        try {
          await this.minio.delete(backup.postgresFile, undefined, BACKUP_BUCKET);
          await this.minio.delete(backup.manifestFile, undefined, BACKUP_BUCKET);
          deleted++;
        } catch { /* best-effort */ }
      }
    }
    return deleted;
  }

  private async listBackupsInternal(): Promise<BackupManifest[]> {
    const backups: BackupManifest[] = [];
    try {
      const keys = await this.minio.list('manifests/', undefined, BACKUP_BUCKET);
      for (const key of keys) {
        try {
          const data = await this.minio.download(key);
          backups.push(JSON.parse(data.toString('utf8')));
        } catch { /* corrupt — skip */ }
      }
    } catch { /* bucket missing */ }
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
