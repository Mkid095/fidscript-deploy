import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DnsProvider, DnsRecord } from '@/modules/domains/providers/dns-provider.interface';
import { DkimService } from '@/modules/email/dns/dkim.service';

/**
 * Email DNS orchestration: owns setup and verification of all email DNS records.
 * Delegates DKIM key generation/storage to DkimService.
 */
@Injectable()
export class MailDnsService {
  private readonly logger = new Logger(MailDnsService.name);

  constructor(
    private dkimService: DkimService,
    private configService: ConfigService,
  ) {}

  /**
   * Set up all email DNS records for a domain:
   *   1. DKIM — ensure key exists in Stalwart, read public key, publish TXT
   *   2. MX record → mail.<domain>
   *   3. SPF TXT record → "v=spf1 mx -all"
   *   4. DMARC TXT record → "v=DMARC1; p=quarantine; ..."
   */
  async setupEmailDns(domain: string): Promise<{
    dkimPublicKey: string;
    mxRecord: string;
    spfRecord: string;
    dmarcRecord: string;
  }> {
    const mailHostname = `mail.${domain}`;
    const zoneId = await this.dkimService.getZoneId(domain);
    const dns = this.dkimService.getDnsProvider();

    // DKIM — Stalwart owns the private key; we publish only the public key.
    await this.dkimService.ensureKey(domain);
    const publicKeyB64 = await this.dkimService.getPublicKey(domain);
    const publicKeyTxt = `v=DKIM1; k=ed25519; p=${publicKeyB64}`;
    await this.ensureTxt(zoneId, `${this.dkimService.selector}._domainkey.${domain}`, publicKeyTxt);

    // MX
    await this.ensureMx(zoneId, domain, mailHostname, 10);

    // SPF — softfail (~all) so receiving MTAs don't hard-reject during the
    // deliverability warm-up; the sending IP is the MX host, so `mx` passes.
    const spfRecord = 'v=spf1 mx ~all';
    await this.ensureTxt(zoneId, domain, spfRecord);

    // DMARC
    const dmarcRecord = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100`;
    await this.ensureTxt(zoneId, `_dmarc.${domain}`, dmarcRecord);

    return { dkimPublicKey: publicKeyTxt, mxRecord: mailHostname, spfRecord, dmarcRecord };
  }

  /**
   * Upsert a TXT record: exactly one TXT at `name` with `content`.
   * If a matching record exists → skip. If a differing TXT exists → delete it
   * and create the correct one (self-correcting, no duplicates). If none →
   * create. (Merging an existing user SPF/DKIM is future "DNS planner" work;
   * for platform-managed domains the platform owns the record.)
   */
  private async ensureTxt(zoneId: string, name: string, content: string): Promise<void> {
    const dns = this.dkimService.getDnsProvider();
    const existing = await dns.listRecords({ zoneId, name, type: 'TXT' });
    if (existing.some(r => r.content === content)) return;
    for (const r of existing) {
      await dns.deleteRecord({ zoneId, recordId: r.id });
    }
    await dns.createRecord({ zoneId, type: 'TXT', name, content, ttl: 3600 });
    this.logger.log(`TXT upserted: ${name}`);
  }

  /** Upsert an MX record: exactly one MX at `name` pointing at mailHostname. */
  private async ensureMx(zoneId: string, name: string, mailHostname: string, priority: number): Promise<void> {
    const dns = this.dkimService.getDnsProvider();
    const existing = await dns.listRecords({ zoneId, name, type: 'MX' });
    if (existing.some(r => r.content === mailHostname)) return;
    for (const r of existing) {
      await dns.deleteRecord({ zoneId, recordId: r.id });
    }
    await dns.createRecord({ zoneId, type: 'MX', name, content: mailHostname, priority, ttl: 3600 });
    this.logger.log(`MX upserted: ${name} → ${mailHostname}`);
  }

  /** Verify domain ownership via the ownership TXT record. */
  async verifyOwnership(domain: string, token: string): Promise<boolean> {
    const zoneId = await this.dkimService.getZoneId(domain);
    const recordName = `${token}._email.${domain}`;
    const records = await this.dkimService.getDnsProvider().listRecords({
      zoneId, name: recordName, type: 'TXT',
    });
    return records.some(r => r.content === token);
  }

  /**
   * Verify email DNS records for a domain.
   * Checks DKIM, SPF, DMARC, and MX records.
   */
  async verifyEmailDns(domain: string): Promise<{ dkim: boolean; spf: boolean; dmarc: boolean; mx: boolean }> {
    const zoneId = await this.dkimService.getZoneId(domain);
    const mailHostname = `mail.${domain}`;
    const dkimName = `default._domainkey.${domain}`;
    const dns = this.dkimService.getDnsProvider();

    const [dkimRecord, spfRecord, dmarcRecord, mxRecords] = await Promise.all([
      dns.listRecords({ zoneId, name: dkimName, type: 'TXT' }),
      dns.listRecords({ zoneId, name: domain, type: 'TXT' }),
      dns.listRecords({ zoneId, name: `_dmarc.${domain}`, type: 'TXT' }),
      dns.listRecords({ zoneId, name: domain, type: 'MX' }),
    ]);

    return {
      dkim: dkimRecord.length > 0,
      spf: spfRecord.some(r => r.content.includes('v=spf1')),
      dmarc: dmarcRecord.some(r => r.content.startsWith('v=DMARC1')),
      mx: mxRecords.some(r => r.content === mailHostname),
    };
  }
}
