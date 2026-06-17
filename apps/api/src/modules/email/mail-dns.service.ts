import { Injectable, Logger } from '@nestjs/common';
import { DnsProvider } from '../domains/providers/dns-provider.interface';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handles DNS setup for email domains: DKIM key generation + MX/SPF/DMARC/DKIM record creation.
 *
 * Uses the Phase 07 DnsProvider interface so all DNS changes go through Cloudflare
 * (or whichever provider is configured) — never direct Cloudflare API calls.
 *
 * DKIM: Ed25519 key pair; private key stored on the Stalwart volume (via mount path),
 * public key published as a TXT record at <selector>._domainkey.<domain>.
 */
@Injectable()
export class MailDnsService {
  private readonly logger = new Logger(MailDnsService.name);
  private readonly dkimKeyPath: string;
  private readonly dkimSelector = 'default';

  constructor(
    private dnsProvider: DnsProvider,
    private configService: ConfigService,
  ) {
    this.dkimKeyPath = this.configService.get('STALWART_DKIM_PATH', '/data/dkim');
  }

  /**
   * Set up all email DNS records for a domain:
   *   1. Generate DKIM Ed25519 key pair, store private key, publish TXT record
   *   2. MX record → mail.<domain>
   *   3. SPF TXT record → "v=spf1 mx -all"
   *   4. DMARC TXT record → "v=DMARC1; p=quarantine; rua=mailto:..."
   */
  async setupEmailDns(domain: string): Promise<{
    dkimPublicKey: string;
    mxRecord: string;
    spfRecord: string;
    dmarcRecord: string;
  }> {
    const platformDomain = this.configService.get('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const mailHostname = `mail.${domain}`;

    // ── 1. DKIM ──────────────────────────────────────────────────────────────────
    const { privateKey, publicKey: dkimPublicKey } = await this.generateDkimKey(domain);

    // Store private key on the Stalwart volume (mounted at STALWART_DKIM_PATH)
    const keyPath = await this.storeDkimPrivateKey(domain, privateKey);
    this.logger.log(`DKIM private key stored at ${keyPath}`);

    // Publish DKIM public key as TXT record
    const dkimRecordName = `${this.dkimSelector}._domainkey.${domain}`;
    await this.dnsProvider.createRecord({
      zoneId: await this.getZoneId(domain),
      type: 'TXT',
      name: dkimRecordName,
      content: dkimPublicKey,
      ttl: 3600,
    });
    this.logger.log(`DKIM record published: ${dkimRecordName}`);

    // ── 2. MX record ───────────────────────────────────────────────────────────
    await this.dnsProvider.createRecord({
      zoneId: await this.getZoneId(domain),
      type: 'MX',
      name: domain,
      content: mailHostname,
      priority: 10,
      ttl: 3600,
    });
    this.logger.log(`MX record published: ${domain} → ${mailHostname}`);

    // ── 3. SPF record ──────────────────────────────────────────────────────────
    await this.dnsProvider.createRecord({
      zoneId: await this.getZoneId(domain),
      type: 'TXT',
      name: domain,
      content: `v=spf1 mx -all`,
      ttl: 3600,
    });
    this.logger.log(`SPF record published: ${domain}`);

    // ── 4. DMARC record ─────────────────────────────────────────────────────────
    const dmarcRecordName = `_dmarc.${domain}`;
    const dmarcContent = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100`;
    await this.dnsProvider.createRecord({
      zoneId: await this.getZoneId(domain),
      type: 'TXT',
      name: dmarcRecordName,
      content: dmarcContent,
      ttl: 3600,
    });
    this.logger.log(`DMARC record published: ${dmarcRecordName}`);

    return { dkimPublicKey, mxRecord: mailHostname, spfRecord: 'v=spf1 mx -all', dmarcRecord: dmarcContent };
  }

  /**
   * Verify domain ownership by checking for the ownership TXT record.
   * The token is stored as {token}._email.{domain} TXT record.
   */
  async verifyOwnership(domain: string, token: string): Promise<boolean> {
    const zoneId = await this.getZoneId(domain);
    const recordName = `${token}._email.${domain}`;

    const records = await this.dnsProvider.listRecords({
      zoneId,
      name: recordName,
      type: 'TXT',
    });

    // Token must be present as the exact content of the TXT record
    return records.some(r => r.content === token);
  }

  /**
   * Verify email DNS records exist and are correct for a domain.
   * Checks: DKIM ( TXT record with public key), SPF, DMARC.
   * Returns the verification result for each record type.
   */
  async verifyEmailDns(domain: string): Promise<{ dkim: boolean; spf: boolean; dmarc: boolean; mx: boolean }> {
    const zoneId = await this.getZoneId(domain);

    const [dkimRecord, spfRecord, dmarcRecord, mxRecords] = await Promise.all([
      this.dnsProvider.listRecords({ zoneId, name: `${this.dkimSelector}._domainkey.${domain}`, type: 'TXT' }),
      this.dnsProvider.listRecords({ zoneId, name: domain, type: 'TXT' }),
      this.dnsProvider.listRecords({ zoneId, name: `_dmarc.${domain}`, type: 'TXT' }),
      this.dnsProvider.listRecords({ zoneId, name: domain, type: 'MX' }),
    ]);

    const mailHostname = `mail.${domain}`;
    const dkim = dkimRecord.length > 0;
    const spf = spfRecord.some(r => r.content.includes('v=spf1'));
    const dmarc = dmarcRecord.some(r => r.content.startsWith('v=DMARC1'));
    const mx = mxRecords.some(r => r.content === mailHostname);

    return { dkim, spf, dmarc, mx };
  }

  /**
   * Generate a DKIM Ed25519 key pair.
   * Returns the public key in the format needed for the DNS TXT record.
   */
  private async generateDkimKey(domain: string): Promise<{ privateKey: string; publicKey: string }> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    // Private key in PEM format for Stalwart
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString('ascii');

    // Public key: encode raw 32-byte key in base64url without padding
    const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
    const publicKeyRaw = publicKeyDer.slice(-32); // last 32 bytes of SPKI DER
    const publicKeyB64Url = Buffer.from(publicKeyRaw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // DKIM TXT record value: "v=DKIM1; k=rsa; p=<base64url_public_key>"
    // For Ed25519: "v=DKIM1; k=ed25519; p=<base64url_public_key>"
    const publicKeyTxt = `v=DKIM1; k=ed25519; p=${publicKeyB64Url}`;

    return { privateKey: privateKeyPem, publicKey: publicKeyTxt };
  }

  /**
   * Store the DKIM private key on the Stalwart volume so Stalwart can sign outgoing mail.
   * File path: <dkimKeyPath>/<selector>/<domain>.private
   */
  private async storeDkimPrivateKey(domain: string, privateKeyPem: string): Promise<string> {
    const selectorDir = path.join(this.dkimKeyPath, this.dkimSelector);
    const keyFile = path.join(selectorDir, `${domain}.private`);

    await fs.mkdir(selectorDir, { recursive: true });
    await fs.writeFile(keyFile, privateKeyPem, { mode: 0o600 });
    return keyFile;
  }

  /**
   * Resolve the Cloudflare zone ID for a domain.
   * Cached per provider instance after first call.
   */
  private async getZoneId(domain: string): Promise<string> {
    const zoneId = await this.dnsProvider.getZoneId(domain);
    if (!zoneId) throw new Error(`Cloudflare zone for ${domain} not found — is the domain on Cloudflare?`);
    return zoneId;
  }
}
