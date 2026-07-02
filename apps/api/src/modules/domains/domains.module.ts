import { Module } from '@nestjs/common';
import { DomainsController } from '@/modules/domains/controllers/domains.controller';
import { DomainsZoneController } from '@/modules/domains/controllers/domains-zone.controller';
import { NotificationsController } from '@/modules/domains/controllers/notifications.controller';
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
import { DnsProviderFactory } from '@/modules/domains/providers/dns-provider-factory';
import { DomainReconciliationService } from '@/modules/domains/services/domain-reconciliation.service';
import { DomainReconciliationQueueService } from '@/modules/domains/services/domain-reconciliation-queue.service';
import { DomainReconciliationWorker } from '@/modules/domains/services/domain-reconciliation-worker.service';
import { DomainReconciliationScheduler } from '@/modules/domains/services/domain-reconciliation-scheduler.service';
import { DomainWizardService } from '@/modules/domains/services/domain-wizard.service';
import { DomainRepairService } from '@/modules/domains/services/domain-repair.service';
import { DomainRepairPlannerService } from '@/modules/domains/services/domain-repair-planner.service';
import { DomainRepairExecutorService } from '@/modules/domains/services/domain-repair-executor.service';
import { DomainRepairQueueService } from '@/modules/domains/services/domain-repair-queue.service';
import { DomainRepairWorker } from '@/modules/domains/services/domain-repair-worker.service';
import { DomainDnsDetectionService } from '@/modules/domains/services/domain-dns-detection.service';
import { DomainEmailKeyService } from '@/modules/domains/services/domain-email-key.service';
import { DomainEmailRecordsService } from '@/modules/domains/services/domain-email-records.service';
import { DomainActivityService } from '@/modules/domains/services/domain-activity.service';
import { DomainNotificationService } from '@/modules/domains/services/domain-notification.service';
import { CloudflareOAuthService } from '@/modules/domains/services/cloudflare-oauth.service';
import { CloudflareOAuthController } from '@/modules/domains/controllers/cloudflare-oauth.controller';
import { EventsModule } from '@/modules/events/events.module';
import { RedisModule } from '@/modules/redis/redis.module';

@Module({
  imports: [EventsModule, RedisModule],
  controllers: [DomainsController, DomainsZoneController, NotificationsController, CloudflareOAuthController],
  providers: [
    CloudflareZoneService,
    CloudflareDnsProvider,
    CloudflareDnsMappersService,
    DnsProviderFactory,
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
    DomainReconciliationService,
    DomainReconciliationQueueService,
    DomainReconciliationWorker,
    DomainReconciliationScheduler,
    DomainWizardService,
    DomainRepairService,
    DomainRepairPlannerService,
    DomainRepairExecutorService,
    DomainRepairQueueService,
    DomainRepairWorker,
    DomainDnsDetectionService,
    DomainEmailKeyService,
    DomainEmailRecordsService,
    DomainActivityService,
    DomainNotificationService,
    CloudflareOAuthService,
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
    DomainReconciliationService,
    DomainReconciliationQueueService,
    DomainReconciliationScheduler,
    DomainWizardService,
    DomainRepairService,
    DomainRepairPlannerService,
    CloudflareZoneService,
    CloudflareDnsProvider,
    DnsProviderFactory,
    'DNS_PROVIDER',
  ],
})
export class DomainsModule {}
