import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { encryptSecret, decryptSecret } from './secret-encryption';

/**
 * SecretsService — unified encrypted project-level secret store.
 *
 * Replaces ad-hoc encrypted fields:
 *   - `DomainConnection.encryptedToken` (Cloudflare OAuth tokens)
 *   - `EmailApiKey.keyHash` (per-service API keys)
 *   - `InstallationSettings.encryptedCloudflareClientId/Secret` (operator-level OAuth)
 *   - `SmtpCredential.encryptedPassword` (system SMTP creds)
 *   - `StorageProviderConfig.credentials` (provider secrets)
 *
 * Key naming convention (recommended, not enforced):
 *   - `CLOUDFLARE_OAUTH_TOKEN` — Cloudflare API access token
 *   - `CLOUDFLARE_ZONE_ID`     — Cloudflare zone ID (the partner to the token)
 *   - `SMTP_PASSWORD`          — SMTP submission password
 *   - `SMTP_USER`              — SMTP submission username
 *   - `STALWART_ADMIN_TOKEN`   — platform Stalwart admin token
 *   - `STALWART_OAUTH_CLIENT_ID` / `_SECRET` — Stalwart OAuth client
 *
 * Storage: `infrastructure.secrets` table. Encryption: AES-256-GCM.
 *
 * Migration window: the constructor reads from BOTH this table and the
 * legacy `DomainConnection.encryptedToken` so existing customers keep
 * working without an explicit migration. New writes go to `Secret`.
 */
@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get a decrypted secret value. Throws NotFoundException if missing.
   *
   * @param projectId  The project to scope by. Pass `null` for platform-level secrets.
   * @param key        The secret key, e.g. 'CLOUDFLARE_OAUTH_TOKEN'.
   */
  async get(projectId: string | null, key: string): Promise<string> {
    const row = await this.findUnique(projectId, key);
    if (!row) {
      throw new NotFoundException(`Secret ${key} not found for project ${projectId ?? '<platform>'}.`);
    }
    // Fire-and-forget last-used update
    void this.prisma.secret
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    return decryptSecret(row.encryptedValue);
  }

  /**
   * Try to get a secret without throwing. Returns null on miss.
   */
  async tryGet(projectId: string | null, key: string): Promise<string | null> {
    try {
      return await this.get(projectId, key);
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    }
  }

  /**
   * Store a secret. Replaces any existing value at the same key.
   */
  async set(
    projectId: string | null,
    key: string,
    value: string,
    opts: { provider?: string; metadata?: Record<string, unknown> } = {},
  ): Promise<void> {
    const encryptedValue = encryptSecret(value);
    const where = this.compoundKey(projectId, key);
    const create = {
      projectId: projectId ?? null,
      key,
      encryptedValue,
      provider: opts.provider ?? null,
      metadata: opts.metadata ?? {},
    };
    const update = {
      encryptedValue,
      provider: opts.provider ?? null,
      metadata: opts.metadata ?? {},
    };
    // Prisma upsert requires the where clause to be present; we build
    // it dynamically because the field is nullable.
    await (this.prisma.secret as any).upsert({ where, create, update });
  }

  /**
   * Delete a secret. Idempotent — returns true if it existed.
   */
  async delete(projectId: string | null, key: string): Promise<boolean> {
    try {
      await (this.prisma.secret as any).delete({ where: this.compoundKey(projectId, key) });
      return true;
    } catch {
      return false;
    }
  }

  private compoundKey(projectId: string | null, key: string) {
    return { projectId_key: { projectId: projectId ?? null, key } };
  }

  private async findUnique(projectId: string | null, key: string) {
    return (this.prisma.secret as any).findUnique({ where: this.compoundKey(projectId, key) });
  }

  /**
   * List metadata for all secrets in a project. Never returns the value.
   */
  async list(projectId: string | null): Promise<
    Array<{
      key: string;
      provider: string | null;
      metadata: Record<string, unknown>;
      lastUsedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const rows = await this.prisma.secret.findMany({
      where: { projectId: projectId ?? null },
      select: {
        key: true,
        provider: true,
        metadata: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { key: 'asc' },
    });
    return rows.map((r) => ({
      key: r.key,
      provider: r.provider,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      lastUsedAt: r.lastUsedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }
}
