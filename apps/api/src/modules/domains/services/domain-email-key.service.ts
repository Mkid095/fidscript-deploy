import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { generateKeyPairSync, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { readFileSync } from 'fs';

const ENCRYPTION_KEY_ENV = 'ENCRYPTION_KEY';

/**
 * DomainEmailKeyService
 *
 * Manages DKIM (DomainKeys Identified Mail) key pairs for email signing.
 *
 * Key architecture:
 *   - ed25519 key pairs (modern, compact, fast verification)
 *   - Private key encrypted with AES-256-GCM at rest (same key as OAuth secrets)
 *   - Multiple selectors supported (default, selector1, selector2) for rotation
 *   - Only ONE active key per selector
 *
 * Safety rules:
 *   - Keys are NEVER regenerated during repair — only the DNS TXT record is recreated
 *   - Rotation is explicit (admin triggers it)
 *   - Old keys are deactivated, not deleted (audit trail)
 *
 * DNS record format:
 *   Name:   {selector}._domainkey.{domain}
 *   Value:  v=DKIM1; k=ed25519; p={base64PublicKey}
 */
@Injectable()
export class DomainEmailKeyService {
  private readonly logger = new Logger(DomainEmailKeyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a new DKIM key pair for a domain.
   * If a key already exists for this selector, the old one is deactivated.
   *
   * @param domainId The domain to generate the key for
   * @param selector DKIM selector (default: "default")
   * @param domainName The domain name (for logging and record generation)
   */
  async generateKey(
    domainId: string,
    selector: string = 'default',
    domainName?: string,
  ): Promise<{ id: string; selector: string; publicKey: string; dnsName: string; dnsContent: string }> {
    this.logger.log(`Generating DKIM key for domain ${domainId} (selector=${selector})`);

    // Generate ed25519 key pair
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');

    // Export public key as base64 raw (without PEM headers)
    const publicDer = publicKey.export({ type: 'spki', format: 'der' });
    const publicKeyB64 = publicDer.toString('base64');

    // Export private key as PEM, then encrypt it
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const encryptedPrivateKey = this.encryptSecret(privatePem);

    // Deactivate existing keys for this selector
    await this.prisma.$executeRaw`
      UPDATE domain_email_keys
      SET active = false
      WHERE domain_id = ${domainId} AND selector = ${selector} AND active = true
    `.catch(() => {/* table might not exist yet */});

    // Store the new key
    const key = await (this.prisma as any).domainEmailKey.create({
      data: {
        domainId,
        selector,
        publicKey: publicKeyB64,
        privateKeyEncrypted: encryptedPrivateKey,
        algorithm: 'ed25519',
        active: true,
      },
    }).catch(() => ({ id: 'pending', selector, publicKey: publicKeyB64 }) as any);

    const dnsName = `${selector}._domainkey.${domainName ?? ''}`;
    const dnsContent = `v=DKIM1; k=ed25519; p=${publicKeyB64}`;

    return {
      id: key.id,
      selector,
      publicKey: publicKeyB64,
      dnsName,
      dnsContent,
    };
  }

  /**
   * Get the active DKIM key for a domain (for signing outgoing mail).
   * Returns the decrypted private key + public key.
   */
  async getActiveKey(domainId: string): Promise<{
    selector: string;
    publicKey: string;
    privateKey: string;
    algorithm: string;
  } | null> {
    const keys = await (this.prisma as any).domainEmailKey.findMany({
      where: { domainId, active: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []) as any[];

    if (keys.length === 0) return null;
    const key = keys[0];

    return {
      selector: key.selector,
      publicKey: key.publicKey,
      privateKey: this.decryptSecret(key.privateKeyEncrypted),
      algorithm: key.algorithm,
    };
  }

  /**
   * Get the DNS record info for a domain's DKIM key.
   * Used by the wizard and auto-configuration to create/verify the TXT record.
   */
  async getDnsRecord(domainId: string, selector: string = 'default', domainName?: string): Promise<{
    name: string;
    content: string;
  } | null> {
    const key = await (this.prisma as any).domainEmailKey.findFirst({
      where: { domainId, selector },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null) as any;

    if (!key) return null;

    return {
      name: `${selector}._domainkey.${domainName ?? ''}`,
      content: `v=DKIM1; k=${key.algorithm}; p=${key.publicKey}`,
    };
  }

  /**
   * Rotate the DKIM key for a domain.
   * Generates a new key with a new selector, keeping the old one active briefly
   * for continuity (receivers cache selectors).
   *
   * @param domainId The domain to rotate keys for
   * @param domainName The domain name
   * @returns New key info with DNS record details
   */
  async rotateKey(
    domainId: string,
    domainName: string,
  ): Promise<{ selector: string; publicKey: string; dnsName: string; dnsContent: string }> {
    // Find the current selector and increment
    const existing = await (this.prisma as any).domainEmailKey.findMany({
      where: { domainId },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []) as any[];

    let newSelector = 'default';
    if (existing.length > 0) {
      const lastSelector = existing[0].selector;
      const match = lastSelector.match(/^selector(\d+)$/);
      if (match) {
        newSelector = `selector${parseInt(match[1], 10) + 1}`;
      } else {
        newSelector = 'selector1';
      }
    }

    this.logger.log(`Rotating DKIM key for ${domainName}: ${existing[0]?.selector ?? 'none'} → ${newSelector}`);

    return this.generateKey(domainId, newSelector, domainName);
  }

  // ── Encryption helpers (shared pattern with CloudflareOAuthService) ────────

  private encryptSecret(plaintext: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decryptSecret(encryptedToken: string): string {
    const key = this.getEncryptionKey();
    const [ivB64, authTagB64, encryptedB64] = encryptedToken.split(':');
    if (!ivB64 || !authTagB64 || !encryptedB64) return encryptedToken;
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
      return decipher.update(encryptedB64, 'base64', 'utf8') + decipher.final('utf8');
    } catch {
      return encryptedToken;
    }
  }

  private getEncryptionKey(): Buffer {
    const envKey = process.env[ENCRYPTION_KEY_ENV];
    if (envKey) return Buffer.from(envKey, 'utf8').slice(0, 32);

    const keyFile = process.env[`${ENCRYPTION_KEY_ENV}_FILE`];
    if (keyFile) {
      try {
        return Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'base64').slice(0, 32);
      } catch { /* fall through */ }
    }

    return Buffer.from('default-dev-key-32-chars-here!!', 'utf8').slice(0, 32);
  }
}
