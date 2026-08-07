import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { EmailDomainController } from './controllers/email-domain.controller';
import { EmailMailboxController } from './controllers/email-mailbox.controller';
import { EmailAliasController } from './controllers/email-alias.controller';
import { EmailSenderIdentityController } from './controllers/email-sender-identity.controller';
import { EmailApiKeyController } from './controllers/email-api-key.controller';
import { EmailMessageController } from './controllers/email-message.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { EmailCatchAllController } from './controllers/email-catch-all.controller';
import { EmailInboundController } from './controllers/email-inbound.controller';
import { EmailEventsController } from './controllers/email-events.controller';
import { PlatformMailboxController } from './controllers/platform-mailbox-message.controller';
import { PlatformAdminMailController } from './controllers/platform-admin-mail.controller';
import { AttachmentConfigController } from './controllers/attachment-config.controller';
import { MailConnectionController } from './controllers/email-connection.controller';
import { EmailTrackingController } from './controllers/email-tracking.controller';
import { EmailWebhookSubscriptionController } from './controllers/email-webhook-subscription.controller';
import { EmailAnalyticsController } from './controllers/email-analytics.controller';
import { EmailStatusController } from './controllers/email-status.controller';
import { EmailDomainService } from './services/domain.service';
import { EmailMailboxService } from './services/mailbox.service';
import { EmailAliasService } from './services/alias.service';
import { EmailSenderIdentityService } from './services/sender-identity.service';
import { EmailApiKeyService } from './services/api-key.service';
import { EmailMessageService } from './services/message.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { EmailMetricsService } from './services/email-metrics.service';
import { BounceParserService } from './services/bounce-parser.service';
import { EmailWebhookSubscriptionService } from './services/email-webhook-subscription.service';
import { EmailInboundService } from './services/inbound.service';
import { SmtpSendService } from './smtp/smtp-send.service';
import { PlatformMailService } from './platform-mail.service';
import { BounceHandlerService } from './services/bounce-handler.service';
import { RateLimitService } from './services/rate-limit.service';
import { EmailRateLimitService } from './services/email-rate-limit.service';
import { MailboxCleanupService } from './services/mailbox-cleanup.service';
import { DomainCleanupService } from './services/domain-cleanup.service';
import { MailDnsService } from './dns/mail-dns.service';
import { DkimService } from './dns/dkim.service';
import { StalwartJmapService } from './stalwart/stalwart-core.service';
import { StalwartAccountService } from './stalwart/stalwart-account.service';
import { StalwartIdentityService } from './stalwart/stalwart-identity.service';
import { WebhookService } from './services/webhook.service';
import { EmailMailboxListService } from './services/email-mailbox-crud.service';
import { EmailBootstrapService } from './services/email-bootstrap.service';
import { DomainsModule } from '@/modules/domains/domains.module';
import { QueuesModule } from '@/modules/queues/queues.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { InfrastructureModule } from '@/modules/infrastructure/infrastructure.module';
import { IEmailProvider, EMAIL_PROVIDER } from './providers/i-email-provider';
import { StalwartEmailProvider } from './providers/stalwart-email.provider';
import { PlatformMailboxMessageService } from './services/platform-mailbox-message.service';
import { AttachmentConfigService } from './services/attachment-config.service';
import { AttachmentStorageService } from './services/attachment-storage.service';
import { EmailAttachmentListener } from './services/attachment-event-listener.service';
import { EmailSyncService } from './services/email-sync.service';
import { EmailSendQueueService } from './services/queue/email-send-queue.service';
import { EmailSendWorkerService } from './services/queue/email-send-worker.service';
import { EmailIdempotencyService } from './services/idempotency.service';
import { EmailReputationService } from './services/email-reputation.service';
import { AbuseDetectionService } from './services/abuse-detection.service';
import { EmailAuditService } from './services/email-audit.service';
import { ConversationService } from './services/conversation.service';
import { RetentionPolicyService } from './services/retention-policy.service';
import { LegalHoldService } from './services/legal-hold.service';

@Module({
  imports: [
    DomainsModule,
    forwardRef(() => QueuesModule),
    forwardRef(() => StorageModule),
    InfrastructureModule,
    forwardRef(() => AuthModule),
    ProjectsModule,
    RealtimeModule,
    RedisModule,
  ],
  controllers: [
    EmailDomainController,
    EmailMailboxController,
    EmailAliasController,
    EmailSenderIdentityController,
    EmailApiKeyController,
    EmailMessageController,
    EmailTemplateController,
    EmailCatchAllController,
    EmailInboundController,
    EmailEventsController,
    PlatformMailboxController,
    PlatformAdminMailController,
    AttachmentConfigController,
    MailConnectionController,
    EmailTrackingController,
    EmailWebhookSubscriptionController,
    EmailAnalyticsController,
    EmailStatusController,
  ],
  providers: [
    EmailDomainService,
    EmailMailboxService,
    EmailAliasService,
    EmailSenderIdentityService,
    EmailApiKeyService,
    EmailMessageService,
    EmailTemplateService,
    EmailTrackingService,
    EmailMetricsService,
    BounceParserService,
    EmailWebhookSubscriptionService,
    EmailInboundService,
    SmtpSendService,
    BounceHandlerService,
    RateLimitService,
    MailboxCleanupService,
    DomainCleanupService,
    MailDnsService,
    DkimService,
    StalwartJmapService,
    StalwartAccountService,
    StalwartIdentityService,
    StalwartEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useExisting: StalwartEmailProvider,
    },
    WebhookService,
    EmailMailboxListService,
    EmailBootstrapService,
    PlatformMailService,
    PlatformMailboxMessageService,
    AttachmentConfigService,
    AttachmentStorageService,
    EmailAttachmentListener,
    EmailSyncService,
    EmailSendQueueService,
    EmailSendWorkerService,
    EmailIdempotencyService,
    EmailRateLimitService,
    EmailReputationService,
    AbuseDetectionService,
    EmailAuditService,
    ConversationService,
    RetentionPolicyService,
    LegalHoldService,
  ],
  exports: [
    EmailDomainService,
    EmailMailboxService,
    EmailMailboxListService,
    EmailAliasService,
    EmailSenderIdentityService,
    EmailApiKeyService,
    EmailMessageService,
    EmailTemplateService,
    EmailTrackingService,
    EmailMetricsService,
    BounceParserService,
    EmailWebhookSubscriptionService,
    EmailInboundService,
    SmtpSendService,
    BounceHandlerService,
    RateLimitService,
    MailboxCleanupService,
    DomainCleanupService,
    MailDnsService,
    DkimService,
    StalwartJmapService,
    StalwartAccountService,
    StalwartIdentityService,
    StalwartEmailProvider,
    EMAIL_PROVIDER,
    WebhookService,
    PlatformMailService,
    PlatformMailboxMessageService,
    AttachmentConfigService,
    AttachmentStorageService,
    EmailSyncService,
    EmailSendQueueService,
    EmailSendWorkerService,
    EmailIdempotencyService,
    EmailRateLimitService,
    EmailReputationService,
    AbuseDetectionService,
    EmailAuditService,
    ConversationService,
    RetentionPolicyService,
    LegalHoldService,
  ],
})
export class EmailModule {}
