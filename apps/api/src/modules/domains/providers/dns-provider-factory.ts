import { Injectable, Logger } from '@nestjs/common';
import { DnsProvider } from './dns-provider.interface';
import { CloudflareDnsProvider } from './cloudflare-platform.service';
import { Route53DnsProvider } from './route53.provider';
import { GoDaddyDnsProvider } from './godaddy.provider';
import { NamecheapDnsProvider } from './namecheap.provider';

/**
 * Connection-like shape used by the factory to pick the right provider.
 * Matches DomainConnection fields without requiring the full Prisma type
 * (which isn't generated yet for the new provider field values).
 */
export interface ProviderConnection {
  provider: string; // 'CLOUDFLARE' | 'ROUTE53' | 'GODADDY' | 'NAMECHEAP'
  encryptedToken: string;
  externalZoneId?: string | null;
  credentials?: Record<string, unknown> | null;
}

/**
 * DnsProviderFactory
 *
 * Selects the correct DnsProvider implementation at runtime based on the
 * DomainConnection's `provider` field. This is the single point where provider
 * selection happens — the rest of the codebase depends on the DnsProvider
 * interface, never a concrete implementation.
 *
 * Providers that need API keys/tokens (Route53, GoDaddy, Namecheap) read
 * their credentials from the DomainConnection.credentials JSON, which is
 * populated when the admin connects that provider via the Integrations page.
 */
@Injectable()
export class DnsProviderFactory {
  private readonly logger = new Logger(DnsProviderFactory.name);

  constructor(
    private cloudflare: CloudflareDnsProvider,
  ) {}

  /**
   * Get the DNS provider for a given connection.
   * Falls back to Cloudflare for unrecognized providers (backward compat).
   */
  getProvider(connection: ProviderConnection): DnsProvider {
    switch ((connection.provider || '').toUpperCase()) {
      case 'ROUTE53':
        return new Route53DnsProvider(connection);

      case 'GODADDY':
        return new GoDaddyDnsProvider(connection);

      case 'NAMECHEAP':
        return new NamecheapDnsProvider(connection);

      case 'CLOUDFLARE':
      default:
        // Cloudflare uses the platform-level token (via CloudflareZoneService),
        // not per-connection credentials — it's a singleton.
        return this.cloudflare;
    }
  }

  /**
   * Check if a provider is supported (has an implementation).
   */
  isSupported(provider: string): boolean {
    return ['CLOUDFLARE', 'ROUTE53', 'GODADDY', 'NAMECHEAP'].includes(
      (provider || '').toUpperCase(),
    );
  }
}
