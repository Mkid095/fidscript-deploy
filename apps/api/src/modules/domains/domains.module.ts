import { Module } from '@nestjs/common';
import { DomainsController } from '@/modules/domains/controllers/domains.controller';
import { DomainsService } from '@/modules/domains/services/domains.service';
import { DomainCrudService } from '@/modules/domains/services/domain-crud.service';
import { DomainVerificationService } from '@/modules/domains/services/domain-verification.service';
import { DomainHealthService } from '@/modules/domains/services/domain-health.service';
import { DomainCleanupService } from '@/modules/domains/services/domain-cleanup.service';
import { DomainDnsService } from '@/modules/domains/services/domain-dns.service';
import { CloudflareDnsProvider } from '@/modules/domains/providers/cloudflare-dns.provider';
import { CloudflareZoneService } from '@/modules/domains/providers/cloudflare-zone.service';

@Module({
  controllers: [DomainsController],
  providers: [
    CloudflareZoneService,
    CloudflareDnsProvider,
    { provide: 'DNS_PROVIDER', useExisting: CloudflareDnsProvider },
    DomainsService,
    DomainCrudService,
    DomainVerificationService,
    DomainHealthService,
    DomainCleanupService,
    DomainDnsService,
  ],
  exports: [
    DomainsService,
    DomainCrudService,
    DomainVerificationService,
    DomainHealthService,
    DomainCleanupService,
    DomainDnsService,
    CloudflareZoneService,
    CloudflareDnsProvider,
    'DNS_PROVIDER',
  ],
})
export class DomainsModule {}
