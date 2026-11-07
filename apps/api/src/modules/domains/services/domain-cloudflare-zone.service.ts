import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';

/**
 * Can the platform configure this domain by itself?
 *
 * That means the domain's zone has to be in a Cloudflare account the platform
 * holds a connection to. The detection service asks this question when a
 * domain is added; this service answers it.
 */
@Injectable()
export class DomainCloudflareZoneService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  /** Whether the domain's zone is in a Cloudflare account we hold. */
  async isZoneAccessible(domain: string): Promise<boolean> {
    // Try to find a Cloudflare connection for this domain by walking up the
    // domain labels — this mirrors the logic in CloudflareZoneService.getZoneId.
    const labels = domain.split('.');
    for (let i = 0; i < labels.length - 1; i++) {
      const potentialApex = labels.slice(i).join('.');
      try {
        // A connection that carries a token, so the zone can be asked about.
        const zoneConnection = await this.prisma.domainConnection.findFirst({
          where: { provider: 'cloudflare', encryptedToken: { not: { equals: '' } } },
        });
        if (!zoneConnection) break;

        // Use Cloudflare API to verify zone exists in the account
        const axios = (await import('axios')).default;
        const token = this.decryptToken(zoneConnection.encryptedToken);
        const response = await axios.get(`https://api.cloudflare.com/client/v4/zones?name=${potentialApex}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: 10_000,
        });

        if (response.data?.result?.length > 0) {
          return true; // Zone is in this Cloudflare account
        }
      } catch {
        // Continue walking up domain labels
      }
    }
    return false;
  }

  /**
   * Decrypt a stored DNS token.
   *
   * A token that cannot be decrypted is an EMPTY string, not the ciphertext:
   * returning the ciphertext made a failed decryption look like a token, and
   * the platform then presented it to the DNS provider.
   */
  private decryptToken(encryptedToken: string): string {
    try {
      return this.crypto.decrypt(encryptedToken);
    } catch {
      return '';
    }
  }
}
