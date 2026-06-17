import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DkimService } from './dkim.service';

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
   *   1. Generate DKIM key pair, store private key, publish TXT record
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

    // DKIM — generate, store private key, publish public key to DNS
    const { privateKeyPem, publicKeyTxt } = await this.dkimService.generateKey(domain);
    const keyPath = await this.dkimService.storePrivateKey(domain, privateKeyPem);
    this.logger.log(`DKIM private key stored at ${keyPath}`);
    await this.dkimService.publishDns(domain, publicKeyTxt);

    // MX
    const zoneId = await this.dkimService.getZoneId(domain);
    await this.dkimService.getDnsProvider().createRecord({
      zoneId, type: 'MX', name: domain, content: mailHostname, priority: 10, ttl: 3600,
    });
    this.logger.log(`MX record published: ${domain} → ${mailHostname}`);

    // SPF
    const spfRecord = 'v=spf1 mx -all';
    await this.dkimService.getDnsProvider().createRecord({
      zoneId, type: 'TXT', name: domain, content: spfRecord, ttl: 3600,
    });
    this.logger.log(`SPF record published: ${domain}`);

    // DMARC
    const dmarcRecord = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100`;
    await this.dkimService.getDnsProvider().createRecord({
      zoneId, type: 'TXT', name: `_dmarc.${domain}`, content: dmarcRecord, ttl: 3600,
    });
    this.logger.log(`DMARC record published: _dmarc.${domain}`);

    return { dkimPublicKey: publicKeyTxt, mxRecord: mailHostname, spfRecord, dmarcRecord };
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
