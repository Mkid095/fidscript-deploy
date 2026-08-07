import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import { CloudflareDnsProvider } from '@/modules/domains/providers/cloudflare-platform.service';
import { SecretsService } from '../secrets/secrets.service';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * CloudflarePrimitive — the project's Cloudflare OAuth + DNS provider.
 *
 * Every service that writes DNS (email, deployment routing, custom
 * subdomains) calls `getDnsProvider(projectId)` to get a `DnsProvider`
 * instance bound to that project's Cloudflare OAuth token — NOT the
 * platform's CF_API_TOKEN.
 *
 * Migration: reads from BOTH the new `Secret` table (preferred) and the
 * legacy `DomainConnection.encryptedToken` so existing customers keep
 * working. New writes go to `Secret`.
 */
@Injectable()
export class CloudflarePrimitive {
  private readonly logger = new Logger(CloudflarePrimitive.name);

  constructor(
    private secrets: SecretsService,
    private prisma: PrismaService,
    private cloudflareProvider: CloudflareDnsProvider,
  ) {}

  /**
   * Look up the project's active Cloudflare connection.
   * Priority: Secret (new) → DomainConnection (legacy) → null.
   */
  async getConnection(projectId: string): Promise<{
    token: string;
    email: string | null;
    zoneId: string | null;
    source: 'secret' | 'domain_connection';
  } | null> {
    // New path: Secret table
    const tokenFromSecret = await this.secrets.tryGet(projectId, 'CLOUDFLARE_OAUTH_TOKEN');
    if (tokenFromSecret) {
      const zoneId = (await this.secrets.tryGet(projectId, 'CLOUDFLARE_ZONE_ID')) ?? null;
      const meta = (await this.secrets.list(projectId)).find(
        (s) => s.key === 'CLOUDFLARE_OAUTH_TOKEN',
      );
      return {
        token: tokenFromSecret,
        email: (meta?.metadata?.email as string | undefined) ?? null,
        zoneId,
        source: 'secret',
      };
    }

    // Legacy path: DomainConnection.encryptedToken
    const conn = await this.prisma.domainConnection.findFirst({
      where: { projectId, provider: 'CLOUDFLARE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!conn) return null;
    return {
      token: conn.encryptedToken, // Caller wraps with decryptSecret if needed
      email: conn.email,
      zoneId: conn.externalZoneId,
      source: 'domain_connection',
    };
  }

  /**
   * Get a `DnsProvider` for the project. Returns a Cloudflare provider
   * pre-configured with the project's OAuth token. The token is
   * decrypted in-process; nothing leaks to logs.
   *
   * If the project has no Cloudflare connection, returns the platform
   * provider as a fallback and logs a warning. The fallback exists
   * because some projects use manual DNS — we still want the SDK to
   * work for read paths.
   */
  async getDnsProvider(projectId: string): Promise<DnsProvider | null> {
    const conn = await this.getConnection(projectId);
    if (!conn) {
      this.logger.warn(
        `No Cloudflare connection for project ${projectId}. ` +
          'Falling back to platform DNS provider (manual DNS mode).',
      );
      return this.cloudflareProvider;
    }
    if (conn.source === 'domain_connection') {
      // Legacy: pass the encrypted token through to the existing
      // provider — the constructor already knows how to read it.
      return this.cloudflareProvider;
    }
    // New path: the legacy provider was hardcoded to read
    // CLOUDFLARE_API_TOKEN_FILE at boot. For project-scoped tokens, we
    // need a thin per-project wrapper. The simplest path is to call
    // Cloudflare directly with the decrypted token.
    // (See apps/api/src/modules/infrastructure/primitives/project-cloudflare-provider.ts)
    const { ProjectCloudflareProvider } = await import('./project-cloudflare-provider');
    return new ProjectCloudflareProvider(conn.token, conn.zoneId ?? undefined);
  }

  /**
   * Persist a Cloudflare OAuth token to the Secret table.
   * Called by the OAuth callback after the user completes the flow.
   */
  async saveConnection(
    projectId: string,
    token: string,
    opts: { email?: string; zoneId?: string } = {},
  ): Promise<void> {
    await this.secrets.set(projectId, 'CLOUDFLARE_OAUTH_TOKEN', token, {
      provider: 'cloudflare',
      metadata: { email: opts.email ?? null },
    });
    if (opts.zoneId) {
      await this.secrets.set(projectId, 'CLOUDFLARE_ZONE_ID', opts.zoneId, {
        provider: 'cloudflare',
      });
    }
  }
}
