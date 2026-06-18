import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import { DomainDnsService } from './domain-dns.service';

@Injectable()
export class DomainCloudflareAutoService {
  constructor(
    private prisma: PrismaService,
    private domainDnsService: DomainDnsService,
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
  ) {}

  async cloudflareAutoSetup(
    domainId: string,
    domain: string,
    deploymentUrl: string,
    isApex: boolean,
  ): Promise<void> {
    try {
      await this.domainDnsService.cloudflareAutoSetup(
        domainId,
        domain,
        deploymentUrl,
        isApex,
        async (d) => {
          const zoneId = await this.dnsProvider.getZoneId(d);
          if (!zoneId) throw new Error(`Cloudflare zone for ${d} not found`);
          return zoneId;
        },
        (opts) => this.dnsProvider.createRecord(opts),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'FAILED' },
      });
      throw new ConflictException(`Cloudflare auto-setup failed: ${msg}`);
    }
  }
}
