import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

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
  async cloudflareAutoSetup(
    domainId: string,
    domain: string,
    deploymentUrl: string | null,
    isApex: boolean,
    getZoneId: (domain: string) => Promise<string>,
    createRecord: (opts: any) => Promise<unknown>,
  ) {
    const zoneId = await getZoneId(domain);
    if (!zoneId) throw new Error(`Cloudflare zone for ${domain} not found — is the domain on Cloudflare?`);

    const slug = this.extractSlug(deploymentUrl || domain);

    await createRecord({
      zoneId, type: 'TXT',
      name: `_fidscript-verification.${domain}`,
      content: `FIDScript verified ${domainId}`,
      ttl: 300,
    });

    if (isApex) {
      await createRecord({
        zoneId, type: 'A', name: domain,
        content: this.configService.get<string>('SERVER_IP', ''),
        ttl: 300, proxied: false,
      });
    } else {
      await createRecord({
        zoneId, type: 'CNAME', name: domain,
        content: `${slug}.apps.${this.platformDomain}`,
        ttl: 300, proxied: false,
      });
    }

    await this.prisma.domain.update({
      where: { id: domainId },
      data: { dnsStatus: 'OWNERSHIP_PENDING' },
    });
  }

  private extractSlug(deploymentUrl: string): string {
    try {
      const host = deploymentUrl.replace('https://', '').replace('http://', '').split(':')[0];
      return host.split('.')[0];
    } catch { return 'app'; }
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

  private encrypt(key: Buffer, plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }
}
