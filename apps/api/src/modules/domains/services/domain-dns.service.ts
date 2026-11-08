import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

import type { CreateRecordOpts, DnsProvider, DnsRecord } from '@/modules/domains/providers/dns-provider.interface';

@Injectable()
export class DomainDnsService {
  private readonly logger = new Logger(DomainDnsService.name);
  private readonly platformDomain: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
  }

  /**
   * Connect Cloudflare account for Mode B auto-DNS.
   * Validates token permissions immediately, stores encrypted credentials.
   */
  async connectCloudflare(userId: string, projectId: string, apiToken: string) {
    let cfEmail = '';
    let permissions: Record<string, boolean> = {};
    try {
      const verifyResp = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { Authorization: `Bearer ${apiToken}` },
        timeout: 10_000,
      });
      if (!verifyResp.data.success) throw new Error('Invalid Cloudflare API token');
      cfEmail = verifyResp.data.result?.email || '';

      const zonesResp = await axios.get('https://api.cloudflare.com/client/v4/zones', {
        headers: { Authorization: `Bearer ${apiToken}` },
        timeout: 10_000,
      });
      if (zonesResp.data.result_info?.total_count > 0) {
        permissions = { 'Zone:Read': true, 'DNS:Edit': true };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ConflictException(`DNS provider token validation failed: ${msg}`);
    }

    const encryptionKey = this.getEncryptionKey();
    const encrypted = this.encrypt(encryptionKey, apiToken);

    const connection = await this.prisma.domainConnection.create({
      data: {
        projectId,
        provider: 'CLOUDFLARE',
        encryptedToken: encrypted,
        tokenId: apiToken.slice(0, 16),
        permissions,
        email: cfEmail,
        lastVerifiedAt: new Date(),
      },
    });

    this.logger.log(`[domains] ${connection.provider} connected for project ${projectId}, connection=${connection.id}`);
    return { success: true, email: cfEmail, connectionId: connection.id };
  }

  /**
   * Mode B auto-setup: create DNS records automatically via Cloudflare API.
   */
  /**
   * The DNS provider for a project — its own Cloudflare account.
   *
   * The token is the one the person connected with, so the zones the
   * platform writes in are the zones they can see. The platform's own
   * token is a last resort: without a connection there is nothing to
   * write with, and the screen says so.
   */
  async getProjectProvider(projectId: string): Promise<DnsProvider | null> {
    const connection = await this.prisma.domainConnection.findFirst({
      where: { projectId, provider: 'CLOUDFLARE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!connection?.encryptedToken) return null;

    const key = this.getEncryptionKey();
    const token = this.decrypt(key, connection.encryptedToken);
    const { ProjectCloudflareProvider } = await import(
      '@/modules/infrastructure/primitives/project-cloudflare-provider'
    );
    return new ProjectCloudflareProvider(token, connection.externalZoneId ?? undefined);
  }

  /**
   * The host a project's application is published on.
   *
   * Traefik publishes every project's deployment at `{slug}.apps.{domain}`,
   * so a CNAME that points at the project's own host is the one thing that
   * will always be right — the domain's first label is not (a domain named
   * `app.example.com` has nothing to do with the project `fidscript`).
   */
  async targetHost(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    });
    return `${project?.slug ?? 'app'}.apps.${this.platformDomain}`;
  }

  async cloudflareAutoSetup(
    domainId: string,
    domain: string,
    targetHost: string,
    isApex: boolean,
    provider: DnsProvider,
  ): Promise<{ verification: string; routing: string }> {
    const zoneId = await provider.getZoneId(domain);
    if (!zoneId) {
      throw new Error(
        `The zone for ${domain} was not found in the connected account — is the domain in it?`,
      );
    }

    const verification = await this.writeRecord(provider, zoneId, {
      zoneId, type: 'TXT',
      name: `_fidscript-verification.${domain}`,
      content: `FIDScript verified ${domainId}`,
      ttl: 300,
      domainId,
    });

    const routing = await this.writeRecord(provider, zoneId, isApex
      ? {
          zoneId, type: 'A', name: domain,
          content: this.configService.get<string>('SERVER_IP', ''),
          ttl: 300, proxied: false,
          domainId,
        }
      : {
          zoneId, type: 'CNAME', name: domain,
          content: targetHost,
          ttl: 300, proxied: false,
          domainId,
        });

    await this.prisma.domain.update({
      where: { id: domainId },
      data: { dnsStatus: 'OWNERSHIP_PENDING' },
    });

    return { verification, routing };
  }

  /**
   * Write a record, whether it is there or not.
   *
   * A provider refuses to create a record that already exists ("an identical
   * record already exists"), and refuses a CNAME where an A record stands
   * ("an A, AAAA, or CNAME record with that host already exists"). Both are
   * the ordinary state of a domain somebody has already pointed at the
   * platform — so the record is looked up first, and only the difference is
   * written.
   *
   * The result says what happened, so the screen can tell the truth:
   *   'created'   — the record was written
   *   'updated'   — it was there and pointed somewhere else
   *   'unchanged' — it was already right
   */
  async writeRecord(
    provider: DnsProvider,
    zoneId: string,
    opts: CreateRecordOpts & { domainId?: string },
  ): Promise<'created' | 'updated' | 'unchanged'> {
    const same = await provider.listRecords({ zoneId, name: opts.name, type: opts.type });
    if (same.length > 0) {
      const record = same[0];
      if (record.content === opts.content) {
        await this.trackRecord(opts, record);
        return 'unchanged';
      }
      await provider.updateRecord({ ...opts, recordId: record.id });
      await this.trackRecord(opts, record);
      return 'updated';
    }

    // A name may hold only one A, AAAA or CNAME. Something else is standing
    // there — either it already points at the platform (and is therefore
    // right), or it points somewhere else and has to be replaced.
    const others = await provider.listRecords({ zoneId, name: opts.name });
    const blocking = others.find(
      (r) => r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME',
    );
    if (blocking) {
      const serverIp = this.configService.get<string>('SERVER_IP', '');
      const pointsAtPlatform =
        (blocking.type === 'A' && blocking.content === serverIp) ||
        (blocking.type === 'CNAME' && blocking.content === opts.content);
      if (pointsAtPlatform) {
        await this.trackRecord(opts, blocking);
        return 'unchanged';
      }
      await provider.updateRecord({ ...opts, recordId: blocking.id });
      await this.trackRecord(opts, blocking);
      return 'updated';
    }

    await provider.createRecord({
      zoneId: opts.zoneId,
      type: opts.type,
      name: opts.name,
      content: opts.content,
      ttl: opts.ttl,
      proxied: opts.proxied,
      priority: opts.priority,
    });
    await this.trackRecord(opts, null);
    return 'created';
  }

  /**
   * Remember what stood at (type, name) before the platform put its value
   * there.
   *
   * The first time the platform writes a name it captures the customer's
   * record (or "there was nothing") into the tracking row's original_*
   * fields; a later write does not clobber a recorded original, so a
   * release always restores the *first* pre-takeover state.
   */
  private async trackRecord(
    opts: CreateRecordOpts & { domainId?: string },
    replacedFrom: DnsRecord | null,
  ) {
    if (!opts.domainId) return;
    const checksum = crypto
      .createHash('sha256')
      .update(`${opts.type}:${opts.name}:${opts.content}`)
      .digest('hex');

    const existing = await this.prisma.managedDnsRecord.findUnique({
      where: {
        domainId_type_name: {
          domainId: opts.domainId,
          type: opts.type,
          name: opts.name,
        },
      },
    });

    if (!existing) {
      await this.prisma.managedDnsRecord.create({
        data: {
          domainId: opts.domainId,
          type: opts.type,
          name: opts.name,
          value: opts.content,
          ttl: opts.ttl ?? 300,
          priority: opts.priority ?? null,
          proxied: opts.proxied ?? false,
          managedBy: 'platform',
          source: 'deployment',
          checksum,
          // The first write remembers what stood there before (or nothing).
          originalValue: replacedFrom ? replacedFrom.content : null,
          originalTtl: replacedFrom?.ttl ?? null,
          originalPriority: replacedFrom?.priority ?? null,
          originalProxied: replacedFrom?.proxied ?? null,
          lastSyncedAt: new Date(),
        },
      });
      return;
    }

    // Update the tracked value; only fill an empty original when this is a
    // true replacement we had not captured before.
    const patch: Record<string, unknown> = {
      value: opts.content,
      ttl: opts.ttl ?? 300,
      priority: opts.priority ?? null,
      proxied: opts.proxied ?? false,
      checksum,
      lastSyncedAt: new Date(),
    };
    if (replacedFrom && existing.originalValue === null) {
      patch.originalValue = replacedFrom.content;
      patch.originalTtl = replacedFrom.ttl ?? null;
      patch.originalPriority = replacedFrom.priority ?? null;
      patch.originalProxied = replacedFrom.proxied ?? null;
    }
    await this.prisma.managedDnsRecord.update({
      where: { id: existing.id },
      data: patch,
    });
  }

  private getEncryptionKey(): Buffer {
    const keyBase64 = this.configService.get<string>('ENCRYPTION_KEY');
    if (keyBase64) return Buffer.from(keyBase64, 'base64');
    const keyFile = this.configService.get<string>('ENCRYPTION_KEY_FILE');
    if (keyFile) {
      try { return Buffer.from(require('fs').readFileSync(keyFile, 'utf8').trim(), 'base64'); } catch { /* fall through */ }
    }
    throw new Error('ENCRYPTION_KEY or ENCRYPTION_KEY_FILE must be set');
  }

  private decrypt(key: Buffer, ciphertext: string): string {
    const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    return decipher.update(Buffer.from(encryptedB64, 'base64')) + decipher.final('utf8');
  }

  private encrypt(key: Buffer, plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }
}
