import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DnsProvider } from '../domains/providers/dns-provider.interface';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * DKIM key management: generates Ed25519 key pairs, stores private keys
 * on the Stalwart volume, and publishes public keys as DNS TXT records.
 */
@Injectable()
export class DkimService {
  private readonly logger = new Logger(DkimService.name);
  private readonly dkimKeyPath: string;
  private readonly dkimSelector = 'default';

  constructor(
    private dnsProvider: DnsProvider,
    private configService: ConfigService,
  ) {
    this.dkimKeyPath = this.configService.get('STALWART_DKIM_PATH', '/data/dkim');
  }

  /**
   * Generate a DKIM Ed25519 key pair.
   * Returns the private key in PEM format and the public key as a DNS TXT record value.
   */
  async generateKey(domain: string): Promise<{ privateKeyPem: string; publicKeyTxt: string }> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    // Private key in PEM format for Stalwart to use when signing
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString('ascii');

    // Encode raw 32-byte key in base64url (no padding) for DNS TXT record
    const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
    const publicKeyRaw = publicKeyDer.slice(-32);
    const publicKeyB64Url = Buffer.from(publicKeyRaw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const publicKeyTxt = `v=DKIM1; k=ed25519; p=${publicKeyB64Url}`;
    return { privateKeyPem, publicKeyTxt };
  }

  /**
   * Store DKIM private key on the Stalwart volume.
   * File: <dkimKeyPath>/<selector>/<domain>.private
   */
  async storePrivateKey(domain: string, privateKeyPem: string): Promise<string> {
    const selectorDir = path.join(this.dkimKeyPath, this.dkimSelector);
    const keyFile = path.join(selectorDir, `${domain}.private`);
    await fs.mkdir(selectorDir, { recursive: true });
    await fs.writeFile(keyFile, privateKeyPem, { mode: 0o600 });
    return keyFile;
  }

  /**
   * Publish the DKIM public key as a DNS TXT record.
   */
  async publishDns(domain: string, publicKeyTxt: string): Promise<void> {
    const zoneId = await this.getZoneId(domain);
    const recordName = `${this.dkimSelector}._domainkey.${domain}`;
    await this.dnsProvider.createRecord({
      zoneId,
      type: 'TXT',
      name: recordName,
      content: publicKeyTxt,
      ttl: 3600,
    });
    this.logger.log(`DKIM TXT record published: ${recordName}`);
  }

  getDnsProvider(): DnsProvider {
    return this.dnsProvider;
  }

  async getZoneId(domain: string): Promise<string> {
    const zoneId = await this.dnsProvider.getZoneId(domain);
    if (!zoneId) throw new Error(`DNS zone for ${domain} not found — is the domain on Cloudflare?`);
    return zoneId;
  }
}
