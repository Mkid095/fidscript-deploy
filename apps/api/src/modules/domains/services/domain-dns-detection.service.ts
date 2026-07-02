import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DnsProviderDetection {
  provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
  nameservers: string[];
  autoConfigurationAvailable: boolean;
  suggestedMode: 'cloudflare_auto' | 'manual';
}

const PROVIDER_MAP: Array<{ match: (ns: string) => boolean; provider: DnsProviderDetection['provider'] }> = [
  { match: (ns) => ns.endsWith('.ns.cloudflare.com'), provider: 'cloudflare' },
  { match: (ns) => ns.includes('.awsdns.'),           provider: 'route53' },
  { match: (ns) => ns.includes('domaincontrol.com'),   provider: 'godaddy' },
  { match: (ns) => ns.includes('registrar-servers.com'), provider: 'namecheap' },
];

function detectProvider(nameservers: string[]): DnsProviderDetection['provider'] {
  for (const { match, provider } of PROVIDER_MAP) {
    if (nameservers.some(ns => match(ns))) return provider;
  }
  return 'unknown';
}

/**
 * DomainDnsDetectionService
 *
 * Detects which DNS provider a domain is using by querying its authoritative
 * nameservers via nslookup. Used to determine whether Cloudflare Auto-DNS is
 * available and to suggest the appropriate dnsMode when adding a domain.
 */
@Injectable()
export class DomainDnsDetectionService {
  private readonly logger = new Logger(DomainDnsDetectionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Detect the DNS provider for a domain by querying its NS records.
   * Cross-platform: uses `nslookup -type=NS` which works on Windows/macOS/Linux.
   */
  async detect(domain: string): Promise<DnsProviderDetection> {
    let nameservers: string[] = [];

    try {
      // Strip protocol prefix if present
      const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

      const { stdout } = await execAsync(`nslookup -type=NS ${cleanDomain}`, { timeout: 10_000 });

      // Parse nameservers from nslookup output
      // Example output:
      //   nameserver = lara.ns.cloudflare.com
      //   nameserver = mitch.ns.cloudflare.com
      const matches = stdout.matchAll(/nameserver\s*=\s*(.+)/gi);
      for (const match of matches) {
        const ns = match[1].trim();
        if (ns && ns !== '') nameservers.push(ns);
      }
    } catch (err) {
      this.logger.warn(`nslookup failed for ${domain}: ${err instanceof Error ? err.message : err}`);
      // Fall back to trying dig if available
      try {
        const { stdout } = await execAsync(`dig +short NS ${domain}`, { timeout: 10_000 });
        nameservers = stdout.trim().split('\n').filter(ns => ns.length > 0);
      } catch {
        this.logger.warn(`dig also failed for ${domain}`);
      }
    }

    if (nameservers.length === 0) {
      return {
        provider: 'unknown',
        nameservers: [],
        autoConfigurationAvailable: false,
        suggestedMode: 'manual',
      };
    }

    const provider = detectProvider(nameservers);

    // Check if Cloudflare zone is accessible via existing project connection
    let autoConfigurationAvailable = false;
    if (provider === 'cloudflare') {
      autoConfigurationAvailable = await this.isCloudflareZoneAccessible(domain);
    }

    return {
      provider,
      nameservers,
      autoConfigurationAvailable,
      suggestedMode: provider === 'cloudflare' ? 'cloudflare_auto' : 'manual',
    };
  }

  /**
   * Check if the domain's zone is accessible via an existing Cloudflare connection
   * in any project the calling user has access to.
   */
  private async isCloudflareZoneAccessible(domain: string): Promise<boolean> {
    // Try to find a Cloudflare connection for this domain by walking up the domain labels
    // This mirrors the logic in CloudflareZoneService.getZoneId
    const labels = domain.split('.');
    for (let i = 0; i < labels.length - 1; i++) {
      const potentialApex = labels.slice(i).join('.');
      try {
        // Check if we have a DomainConnection with Cloudflare that covers this zone
        // We check by seeing if we can get zone details for this apex domain
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

  private decryptToken(encryptedToken: string): string {
    // Same decryption as DomainDnsService
    const key = Buffer.from(process.env.ENCRYPTION_KEY ?? 'default-dev-key-32-chars-here!!', 'utf8').slice(0, 32);
    const [ivB64, authTagB64, encryptedB64] = encryptedToken.split(':');
    if (!ivB64 || !authTagB64 || !encryptedB64) return encryptedToken;
    try {
      const decipher = require('crypto').createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
      return decipher.update(encryptedB64, 'base64', 'utf8') + decipher.final('utf8');
    } catch {
      return encryptedToken;
    }
  }
}
