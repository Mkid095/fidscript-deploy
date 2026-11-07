import { Injectable, Logger } from '@nestjs/common';
import { DomainCloudflareZoneService } from '@/modules/domains/services/domain-cloudflare-zone.service';
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

  constructor(private zones: DomainCloudflareZoneService) {}

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
      autoConfigurationAvailable = await this.zones.isZoneAccessible(domain);
    }

    return {
      provider,
      nameservers,
      autoConfigurationAvailable,
      suggestedMode: provider === 'cloudflare' ? 'cloudflare_auto' : 'manual',
    };
  }
}
