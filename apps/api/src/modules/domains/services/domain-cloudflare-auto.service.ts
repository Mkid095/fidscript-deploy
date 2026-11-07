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
    projectId: string,
    domainId: string,
    domain: string,
    isApex: boolean,
  ): Promise<void> {
    try {
      // The project's OWN Cloudflare account — the one the person connected
      // with. The platform's token is a last resort, and a person who has
      // connected an account must not have their records written with
      // somebody else's token.
      const provider = (await this.domainDnsService.getProjectProvider(projectId)) ?? this.dnsProvider;

      // The host the project's application is published on — the record
      // points there, whatever the domain is called.
      const targetHost = await this.domainDnsService.targetHost(projectId);

      await this.domainDnsService.cloudflareAutoSetup(
        domainId,
        domain,
        targetHost,
        isApex,
        provider,
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
