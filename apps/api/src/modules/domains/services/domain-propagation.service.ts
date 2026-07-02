import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '@/prisma/prisma.service';

const execAsync = promisify(exec);

export interface ResolverCheck {
  resolver: string;
  location: string;
  server: string;
  status: 'propagated' | 'pending' | 'failed';
  value: string | null;
  responseTimeMs: number;
}

export interface PropagationResult {
  domain: string;
  recordType: string;
  expectedValue: string;
  checks: ResolverCheck[];
  propagated: number;
  total: number;
  percentage: number;
  fullyPropagated: boolean;
  checkedAt: string;
}

/**
 * Major public DNS resolvers to check for propagation.
 * Each entry includes the resolver IP and a human-readable label.
 */
const RESOLVERS: Array<{ name: string; location: string; server: string }> = [
  { name: 'Cloudflare', location: 'Global', server: '1.1.1.1' },
  { name: 'Google', location: 'Global', server: '8.8.8.8' },
  { name: 'Quad9', location: 'Global', server: '9.9.9.9' },
  { name: 'OpenDNS', location: 'Global', server: '208.67.222.222' },
  { name: 'Comodo', location: 'Global', server: '8.26.56.26' },
  { name: 'Verisign', location: 'Global', server: '64.6.64.6' },
];

/**
 * DomainPropagationService
 *
 * Checks DNS record propagation across multiple public resolvers.
 *
 * Unlike the wizard's single-resolver check, this service queries 6 major
 * resolvers simultaneously and reports which ones have the expected value.
 * This gives users confidence that their DNS changes have propagated globally.
 *
 * Uses `nslookup` (cross-platform) with the `@server` syntax to query
 * specific resolvers.
 */
@Injectable()
export class DomainPropagationService {
  private readonly logger = new Logger(DomainPropagationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check propagation of a DNS record across all major resolvers.
   *
   * @param domain The domain/record name to check (e.g. "example.com" or "_dmarc.example.com")
   * @param recordType The record type (A, AAAA, CNAME, TXT, MX)
   * @param expectedValue The value that should be returned (partial match for TXT)
   */
  async checkPropagation(
    domain: string,
    recordType: string,
    expectedValue: string,
  ): Promise<PropagationResult> {
    const cleanDomain = domain.replace(/\.$/, '').trim();
    this.logger.log(`[propagation] Checking ${recordType} ${cleanDomain} across ${RESOLVERS.length} resolvers`);

    const checks = await Promise.all(
      RESOLVERS.map(resolver => this.checkResolver(cleanDomain, recordType, expectedValue, resolver)),
    );

    const propagated = checks.filter(c => c.status === 'propagated').length;
    const total = checks.length;
    const percentage = Math.round((propagated / total) * 100);

    return {
      domain: cleanDomain,
      recordType,
      expectedValue,
      checks,
      propagated,
      total,
      percentage,
      fullyPropagated: propagated === total,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Query a specific resolver for a DNS record.
   */
  private async checkResolver(
    domain: string,
    recordType: string,
    expectedValue: string,
    resolver: { name: string; location: string; server: string },
  ): Promise<ResolverCheck> {
    const startTime = Date.now();
    try {
      // Use nslookup with @server syntax: nslookup -type=TXT domain 1.1.1.1
      const { stdout } = await execAsync(
        `nslookup -type=${recordType} ${domain} ${resolver.server}`,
        { timeout: 10_000 },
      );

      const responseTimeMs = Date.now() - startTime;
      const value = this.extractValue(stdout, recordType);

      if (!value) {
        return {
          resolver: resolver.name,
          location: resolver.location,
          server: resolver.server,
          status: 'pending',
          value: null,
          responseTimeMs,
        };
      }

      // Check if the value matches (partial match for TXT, exact for others)
      const matches = recordType === 'TXT'
        ? value.includes(expectedValue) || expectedValue.includes(value)
        : value.includes(expectedValue);

      return {
        resolver: resolver.name,
        location: resolver.location,
        server: resolver.server,
        status: matches ? 'propagated' : 'pending',
        value,
        responseTimeMs,
      };
    } catch (err) {
      const responseTimeMs = Date.now() - startTime;
      this.logger.debug(`[propagation] ${resolver.name} failed: ${err instanceof Error ? err.message : err}`);
      return {
        resolver: resolver.name,
        location: resolver.location,
        server: resolver.server,
        status: 'failed',
        value: null,
        responseTimeMs,
      };
    }
  }

  /**
   * Extract the DNS record value from nslookup output.
   * nslookup format varies by record type:
   *   A:     "Address: 1.2.3.4"
   *   CNAME: "canonical name = target.example.com"
   *   TXT:   "text = "v=spf1 mx ~all""
   *   MX:    "mail exchanger = 10 mail.example.com"
   */
  private extractValue(stdout: string, recordType: string): string | null {
    const lines = stdout.split('\n');

    switch (recordType.toUpperCase()) {
      case 'A':
      case 'AAAA': {
        // Look for "Address: <ip>" but skip the resolver's own address
        const matches = lines
          .filter(l => l.includes('Address:') && !l.includes('Address:  1.') && !l.includes('Address:  8.'))
          .map(l => l.split('Address:').pop()?.trim())
          .filter(Boolean);
        return matches[0] ?? null;
      }
      case 'CNAME': {
        const match = stdout.match(/canonical name\s*=\s*(.+)/i);
        return match ? match[1].trim() : null;
      }
      case 'TXT': {
        const matches = [...stdout.matchAll(/text\s*=\s*"?([^"\n]+)"?/gi)];
        return matches.length > 0 ? matches.map(m => m[1].trim()).join(' ') : null;
      }
      case 'MX': {
        const match = stdout.match(/mail exchanger\s*=\s*(.+)/i);
        return match ? match[1].trim() : null;
      }
      default:
        return null;
    }
  }

  /**
   * Check propagation for all managed records of a domain at once.
   * Useful for the wizard to show overall propagation progress.
   */
  async checkDomainPropagation(domainId: string): Promise<{
    domain: string;
    records: PropagationResult[];
    overallPercentage: number;
  }> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });
    if (!domain) throw new Error('Domain not found');

    const managedRecords = await (this.prisma as any).managedDnsRecord.findMany({
      where: { domainId, managedBy: 'platform' },
    }).catch(() => []);

    if (managedRecords.length === 0) {
      return {
        domain: domain.domain,
        records: [],
        overallPercentage: 0,
      };
    }

    // Check each managed record (limit to 5 to avoid rate limits)
    const recordsToCheck = managedRecords.slice(0, 5);
    const results = await Promise.all(
      recordsToCheck.map((r: any) =>
        this.checkPropagation(r.name, r.type, r.value),
      ),
    );

    const overallPercentage = Math.round(
      results.reduce((sum, r) => sum + r.percentage, 0) / results.length,
    );

    return {
      domain: domain.domain,
      records: results,
      overallPercentage,
    };
  }
}
