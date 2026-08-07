import { Injectable, Logger } from '@nestjs/common';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import { DkimService } from '@/modules/email/dns/dkim.service';
import { CloudflarePrimitive } from '@/modules/infrastructure/primitives/cloudflare.primitive';

/**
 * Email DNS orchestration — refactored to consume the Infrastructure layer.
 *
 * Every method now takes `projectId` as its first argument. The Cloudflare
 * DNS provider is resolved per-request via `CloudflarePrimitive.getDnsProvider(projectId)`
 * so the records land in the customer's Cloudflare zone, not the
 * platform's.
 *
 * What this still calls from the platform:
 *   - `DkimService.ensureKey` — Stalwart's DKIM key store is platform-wide
 *     (the same key signs outbound mail from any project on the same
 *     instance). DKIM TXT publish, however, is per-project.
 */
@Injectable()
export class MailDnsService {
  private readonly logger = new Logger(MailDnsService.name);

  constructor(
    private dkimService: DkimService,
    private cloudflare: CloudflarePrimitive,
  ) {}

  /**
   * Set up all email DNS records for a project's domain:
   *   1. DKIM — ensure key exists in Stalwart, read public key, publish TXT
   *   2. MX record → mail.<domain>
   *   3. SPF TXT record
   *   4. DMARC TXT record
   */
  async setupEmailDns(
    projectId: string,
    domain: string,
  ): Promise<{ dkimPublicKey: string; mxRecord: string; spfRecord: string; dmarcRecord: string }> {
    const dns = await this.cloudflare.getDnsProvider(projectId);
    if (!dns) throw new Error(`No Cloudflare connection for project ${projectId}.`);
    const zoneId = await dns.getZoneId(domain);
    if (!zoneId) throw new Error(`DNS zone for ${domain} not found.`);
    const mailHostname = `mail.${domain}`;

    // DKIM — Stalwart owns the private key; we publish only the public key.
    await this.dkimService.ensureKey(domain);
    const publicKeyB64 = await this.dkimService.getPublicKey(domain);
    const publicKeyTxt = `v=DKIM1; k=ed25519; p=${publicKeyB64}`;
    await this.ensureTxt(dns, zoneId, `${this.dkimService.selector}._domainkey.${domain}`, publicKeyTxt);

    // MX
    await this.ensureMx(dns, zoneId, domain, mailHostname, 10);

    // SPF — softfail (~all) during warm-up; the sending IP is the MX host, so `mx` passes.
    const spfRecord = 'v=spf1 mx ~all';
    await this.ensureTxt(dns, zoneId, domain, spfRecord);

    // DMARC
    const dmarcRecord = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100`;
    await this.ensureTxt(dns, zoneId, `_dmarc.${domain}`, dmarcRecord);

    return { dkimPublicKey: publicKeyTxt, mxRecord: mailHostname, spfRecord, dmarcRecord };
  }

  private async ensureTxt(dns: DnsProvider, zoneId: string, name: string, content: string): Promise<void> {
    const existing = await dns.listRecords({ zoneId, name, type: 'TXT' });
    if (existing.some((r) => r.content === content)) return;
    for (const r of existing) {
      await dns.deleteRecord({ zoneId, recordId: r.id });
    }
    await dns.createRecord({ zoneId, type: 'TXT', name, content, ttl: 3600 });
    this.logger.log(`TXT upserted: ${name}`);
  }

  private async ensureMx(dns: DnsProvider, zoneId: string, name: string, mailHostname: string, priority: number): Promise<void> {
    const existing = await dns.listRecords({ zoneId, name, type: 'MX' });
    if (existing.some((r) => r.content === mailHostname)) return;
    for (const r of existing) {
      await dns.deleteRecord({ zoneId, recordId: r.id });
    }
    await dns.createRecord({ zoneId, type: 'MX', name, content: mailHostname, priority, ttl: 3600 });
    this.logger.log(`MX upserted: ${name} → ${mailHostname}`);
  }

  async verifyOwnership(projectId: string, domain: string, token: string): Promise<boolean> {
    const dns = await this.cloudflare.getDnsProvider(projectId);
    if (!dns) return false;
    const zoneId = await dns.getZoneId(domain);
    if (!zoneId) return false;
    const recordName = `${token}._email.${domain}`;
    const records = await dns.listRecords({ zoneId, name: recordName, type: 'TXT' });
    return records.some((r) => r.content === token);
  }

  async verifyEmailDns(
    projectId: string,
    domain: string,
  ): Promise<{ dkim: boolean; spf: boolean; dmarc: boolean; mx: boolean }> {
    const dns = await this.cloudflare.getDnsProvider(projectId);
    if (!dns) return { dkim: false, spf: false, dmarc: false, mx: false };
    const zoneId = await dns.getZoneId(domain);
    if (!zoneId) return { dkim: false, spf: false, dmarc: false, mx: false };
    const mailHostname = `mail.${domain}`;
    const dkimName = `default._domainkey.${domain}`;

    const [dkimRecord, spfRecord, dmarcRecord, mxRecords] = await Promise.all([
      dns.listRecords({ zoneId, name: dkimName, type: 'TXT' }),
      dns.listRecords({ zoneId, name: domain, type: 'TXT' }),
      dns.listRecords({ zoneId, name: `_dmarc.${domain}`, type: 'TXT' }),
      dns.listRecords({ zoneId, name: domain, type: 'MX' }),
    ]);

    return {
      dkim: dkimRecord.length > 0,
      spf: spfRecord.some((r) => r.content.includes('v=spf1')),
      dmarc: dmarcRecord.some((r) => r.content.startsWith('v=DMARC1')),
      mx: mxRecords.some((r) => r.content === mailHostname),
    };
  }
}
