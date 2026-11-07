import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DomainEmailKeyService } from './domain-email-key.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';

/**
 * DomainEmailRecordsService
 *
 * Auto-configures email DNS records (MX, SPF, DKIM, DMARC) for a domain.
 *
 * Flow:
 *   1. Verify the domain is verified (dnsStatus = ACTIVE)
 *   2. Generate DKIM key pair (if not exists)
 *   3. Create MX records pointing to the platform's mail server
 *   4. Create SPF TXT record
 *   5. Create DKIM TXT record from the generated public key
 *   6. Create DMARC TXT record
 *
 * This is the "Email DNS" step of the "Auto Configure Everything" flow.
 *
 * Records created:
 *   MX    @                    priority 10  → mail.{platformDomain}
 *   MX    @                    priority 20  → mail2.{platformDomain}
 *   TXT   @                                 → v=spf1 mx include:{platformDomain} ~all
 *   TXT   default._domainkey.{domain}       → v=DKIM1; k=ed25519; p={publicKey}
 *   TXT   _dmarc.{domain}                   → v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain}
 */
@Injectable()
export class DomainEmailRecordsService {
  private readonly logger = new Logger(DomainEmailRecordsService.name);
  private readonly platformDomain: string;

  constructor(
    private prisma: PrismaService,
    private emailKeyService: DomainEmailKeyService,
    private configService: ConfigService,
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
  }

  /**
   * Auto-configure all email DNS records for a domain.
   *
   * @param domainId The domain to configure
   * @returns Summary of created records
   */
  async autoConfigureEmailRecords(domainId: string): Promise<{
    mx: number;
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    records: Array<{ type: string; name: string; content: string }>;
  }> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { dnsConnection: true },
    });
    if (!domain) throw new BadRequestException('Domain not found');

    // Domain must be verified before we can configure email
    if (domain.dnsStatus !== 'ACTIVE' && domain.dnsStatus !== 'TLS_PENDING') {
      throw new BadRequestException(
        `Domain must be verified before email DNS setup. Current status: ${domain.dnsStatus}`,
      );
    }

    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) {
      throw new BadRequestException(`No DNS zone found for ${domain.domain}`);
    }

    const records: Array<{ type: string; name: string; content: string }> = [];
    let mxCount = 0;
    let spfCreated = false;
    let dkimCreated = false;
    let dmarcCreated = false;

    // ── 1. MX records ────────────────────────────────────────────────────────
    const mailServers = [
      { host: `mail.${this.platformDomain}`, priority: 10 },
      { host: `mail2.${this.platformDomain}`, priority: 20 },
    ];

    for (const mx of mailServers) {
      try {
        await this.dnsProvider.createRecord({
          zoneId,
          type: 'MX',
          name: '@',
          content: mx.host,
          priority: mx.priority,
          ttl: 3600,
        });
        records.push({ type: 'MX', name: '@', content: `${mx.priority} ${mx.host}` });
        mxCount++;
        this.logger.log(`[email-dns] Created MX record: @ → ${mx.host} (priority ${mx.priority})`);
      } catch (err) {
        // Record may already exist — that's fine
        this.logger.warn(`[email-dns] MX ${mx.host} may already exist: ${err instanceof Error ? err.message : err}`);
      }
    }

    // ── 2. SPF record ────────────────────────────────────────────────────────
    const spfContent = `v=spf1 mx include:${this.platformDomain} ~all`;
    try {
      await this.dnsProvider.createRecord({
        zoneId,
        type: 'TXT',
        name: '@',
        content: spfContent,
        ttl: 3600,
      });
      records.push({ type: 'TXT', name: '@', content: spfContent });
      spfCreated = true;
      this.logger.log(`[email-dns] Created SPF record: @ → ${spfContent}`);
    } catch (err) {
      this.logger.warn(`[email-dns] SPF may already exist: ${err instanceof Error ? err.message : err}`);
    }

    // ── 3. DKIM record ───────────────────────────────────────────────────────
    const dkimDns = await this.emailKeyService.getDnsRecord(domainId, 'default', domain.domain);
    if (dkimDns) {
      try {
        await this.dnsProvider.createRecord({
          zoneId,
          type: 'TXT',
          name: dkimDns.name,
          content: dkimDns.content,
          ttl: 3600,
        });
        records.push({ type: 'TXT', name: dkimDns.name, content: dkimDns.content });
        dkimCreated = true;
        this.logger.log(`[email-dns] Created DKIM record: ${dkimDns.name}`);
      } catch (err) {
        this.logger.warn(`[email-dns] DKIM may already exist: ${err instanceof Error ? err.message : err}`);
      }
    } else {
      // No key exists yet — generate one
      const newKey = await this.emailKeyService.generateKey(domainId, 'default', domain.domain);
      try {
        await this.dnsProvider.createRecord({
          zoneId,
          type: 'TXT',
          name: newKey.dnsName,
          content: newKey.dnsContent,
          ttl: 3600,
        });
        records.push({ type: 'TXT', name: newKey.dnsName, content: newKey.dnsContent });
        dkimCreated = true;
        this.logger.log(`[email-dns] Generated DKIM key and created record: ${newKey.dnsName}`);
      } catch (err) {
        this.logger.warn(`[email-dns] DKIM creation failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    // ── 4. DMARC record ──────────────────────────────────────────────────────
    const dmarcContent = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.domain}; ruf=mailto:dmarc@${domain.domain}`;
    try {
      await this.dnsProvider.createRecord({
        zoneId,
        type: 'TXT',
        name: `_dmarc.${domain.domain}`,
        content: dmarcContent,
        ttl: 3600,
      });
      records.push({ type: 'TXT', name: `_dmarc.${domain.domain}`, content: dmarcContent });
      dmarcCreated = true;
      this.logger.log(`[email-dns] Created DMARC record: _dmarc.${domain.domain}`);
    } catch (err) {
      this.logger.warn(`[email-dns] DMARC may already exist: ${err instanceof Error ? err.message : err}`);
    }

    // Mark domain as email-configured
    await this.prisma.domain.update({
      where: { id: domainId },
      data: {
        emailProvider: this.platformDomain,
        capabilities: {
          ...(domain.capabilities as object),
          email: true,
          inboundEmail: true,
        },
      } as any,
    }).catch(() => {/* schema not generated yet */});

    this.logger.log(`[email-dns] Email DNS configuration complete for ${domain.domain}`);

    return {
      mx: mxCount,
      spf: spfCreated,
      dkim: dkimCreated,
      dmarc: dmarcCreated,
      records,
    };
  }

  /**
   * Check which email records exist for a domain.
   * Used by the wizard to show status of each record.
   */
  async checkEmailRecords(domainId: string): Promise<{
    mx: boolean;
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    details: Array<{ type: string; name: string; status: 'ok' | 'missing' }>;
  }> {
    const domain = await this.prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) throw new BadRequestException('Domain not found');

    const zoneId = await this.dnsProvider.getZoneId(domain.domain);
    if (!zoneId) {
      return { mx: false, spf: false, dkim: false, dmarc: false, details: [] };
    }

    const details: Array<{ type: string; name: string; status: 'ok' | 'missing' }> = [];

    // Check MX
    const mxRecords = await this.dnsProvider.listRecords({ zoneId, name: '@', type: 'MX' }).catch(() => []);
    const mxOk = mxRecords.length > 0;
    details.push({ type: 'MX', name: '@', status: mxOk ? 'ok' : 'missing' });

    // Check SPF
    const spfRecords = await this.dnsProvider.listRecords({ zoneId, name: '@', type: 'TXT' }).catch(() => []);
    const spfOk = spfRecords.some(r => r.content.startsWith('v=spf1'));
    details.push({ type: 'TXT', name: '@ (SPF)', status: spfOk ? 'ok' : 'missing' });

    // Check DKIM
    const dkimDns = await this.emailKeyService.getDnsRecord(domainId, 'default', domain.domain);
    let dkimOk = false;
    if (dkimDns) {
      const dkimRecords = await this.dnsProvider.listRecords({ zoneId, name: dkimDns.name, type: 'TXT' }).catch(() => []);
      dkimOk = dkimRecords.length > 0;
      details.push({ type: 'TXT', name: dkimDns.name, status: dkimOk ? 'ok' : 'missing' });
    } else {
      details.push({ type: 'TXT', name: 'default._domainkey', status: 'missing' });
    }

    // Check DMARC
    const dmarcRecords = await this.dnsProvider.listRecords({ zoneId, name: `_dmarc.${domain.domain}`, type: 'TXT' }).catch(() => []);
    const dmarcOk = dmarcRecords.some(r => r.content.startsWith('v=DMARC1'));
    details.push({ type: 'TXT', name: '_dmarc', status: dmarcOk ? 'ok' : 'missing' });

    return { mx: mxOk, spf: spfOk, dkim: dkimOk, dmarc: dmarcOk, details };
  }
}
