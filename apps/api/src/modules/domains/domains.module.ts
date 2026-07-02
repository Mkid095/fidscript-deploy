import { Module } from '@nestjs/common';
import { DomainsController } from '@/modules/domains/controllers/domains.controller';
import { DomainsService } from '@/modules/domains/services/domains.service';
import { DomainCrudService } from '@/modules/domains/services/domain-crud.service';
import { DomainListService } from '@/modules/domains/services/domain-list.service';
import { DomainAddService } from '@/modules/domains/services/domain-add.service';
import { DomainVerificationService } from '@/modules/domains/services/domain-verification.service';
import { DomainVerificationChecksService } from '@/modules/domains/services/domain-verification-checks.service';
import { DomainHealthService } from '@/modules/domains/services/domain-health.service';
import { DomainCleanupService } from '@/modules/domains/services/domain-cleanup.service';
import { DomainDnsService } from '@/modules/domains/services/domain-dns.service';
import { DomainMxService } from '@/modules/domains/services/domain-mx.service';
import { DomainChecksService } from '@/modules/domains/services/domain-checks.service';
import { DomainCloudflareAutoService } from '@/modules/domains/services/domain-cloudflare-auto.service';
import { DomainAccessService } from '@/modules/domains/services/domain-access.service';
import { DomainConnectionService } from '@/modules/domains/services/domain-connection.service';
import { DomainSslService } from '@/modules/domains/services/domain-ssl.service';
import { CloudflareDnsProvider } from '@/modules/domains/providers/cloudflare-platform.service';
import { CloudflareZoneService } from '@/modules/domains/providers/cloudflare-zone.service';
import { CloudflareDnsMappersService } from '@/modules/domains/providers/cloudflare-dns-mappers.service';

@Module({
  controllers: [DomainsController],
  providers: [
    CloudflareZoneService,
    CloudflareDnsProvider,
    CloudflareDnsMappersService,
    { provide: 'DNS_PROVIDER', useExisting: CloudflareDnsProvider },
    DomainsService,
    DomainCrudService,
    DomainListService,
    DomainAddService,
    DomainVerificationService,
    DomainVerificationChecksService,
    DomainHealthService,
    DomainCleanupService,
    DomainDnsService,
    DomainMxService,
    DomainChecksService,
    DomainCloudflareAutoService,
    DomainAccessService,
    DomainConnectionService,
    DomainSslService,
  ],
  exports: [
    DomainsService,
    DomainCrudService,
    DomainListService,
    DomainAddService,
    DomainVerificationService,
    DomainVerificationChecksService,
    DomainHealthService,
    DomainCleanupService,
    DomainDnsService,
    DomainMxService,
    DomainChecksService,
    DomainCloudflareAutoService,
    DomainAccessService,
    DomainConnectionService,
    DomainSslService,
    CloudflareZoneService,
    CloudflareDnsProvider,
    'DNS_PROVIDER',
  ],
})
export class DomainsModule {}
