/**
 * Email module provider list — single source of truth for the
 * providers/exports arrays on EmailModule. Kept separate from
 * `email.module.ts` so the module file stays under the 150-line limit.
 */
import { IEmailProvider, EMAIL_PROVIDER } from './providers/i-email-provider';
import { StalwartEmailProvider } from './providers/stalwart-email.provider';
import { MailDnsService } from './dns/mail-dns.service';
import { DkimService } from './dns/dkim.service';
import { SmtpSendService } from './smtp/smtp-send.service';
import { SmtpSendPrecheckService } from './smtp/smtp-send-precheck.service';
import { StalwartJmapService } from './stalwart/stalwart-core.service';
import { StalwartAccountService } from './stalwart/stalwart-account.service';
import { StalwartIdentityService } from './stalwart/stalwart-identity.service';
import { PlatformMailService } from './platform-mail.service';

import { EmailDomainService } from './services/domain.service';
import { EmailMailboxService, MailboxCrudService, MailboxAccessService } from './services/mailbox-split-index';
import { EmailAliasService } from './services/alias.service';
import { EmailSenderIdentityService } from './services/sender-identity.service';
import { EmailApiKeyService } from './services/api-key.service';
import { EmailMessageService } from './services/message.service';
import {
  EmailTemplateService, EmailTemplateCrudService, EmailTemplateRenderService,
} from './services/email-template-split-index';
import {
  EmailTrackingService, EmailTrackingStoreService,
} from './services/email-tracking-split-index';
import { EmailMetricsService } from './services/email-metrics.service';
import { BounceParserService, BounceRuleMatcherService } from './services/bounce-split-index';
import {
  EmailWebhookSubscriptionService, EmailWebhookSubscriptionCrudService, EmailWebhookDispatchService,
} from './services/email-webhook-split-index';
import { EmailInboundService } from './services/inbound.service';
import { EmailCatchallCrudService } from './services/email-catchall-crud.service';
import { EmailCatchallDeliveryService } from './services/email-catchall-delivery.service';
import { BounceHandlerService } from './services/bounce-handler.service';
import { RateLimitService } from './services/rate-limit.service';
import {
  EmailRateLimitService, EmailRateLimitStoreService, EmailRateLimitCheckerService,
} from './services/email-rate-limit-split-index';
import { MailboxCleanupService } from './services/mailbox-cleanup.service';
import { DomainCleanupService } from './services/domain-cleanup.service';
import { WebhookService } from './services/webhook.service';
import { EmailMailboxListService } from './services/email-mailbox-crud.service';
import { EmailBootstrapService } from './services/email-bootstrap.service';
import {
  PlatformMailboxMessageService, PlatformMailboxMessageQueryService,
  PlatformMailboxMessageQueryHelpers, PlatformMailboxMessageActionService,
  PlatformMailboxJmapClientService,
} from './services/platform-mailbox-split-index';
import {
  AttachmentConfigService, AttachmentConfigCrudService, AttachmentConfigValidationService,
} from './services/attachment-config-split-index';
import {
  AttachmentStorageService, AttachmentStorageS3Service, AttachmentExtractInboundService,
} from './services/attachment-storage-split-index';
import { EmailAttachmentListener } from './services/attachment-event-listener.service';
import {
  EmailSyncService, EmailSyncPullService, EmailSyncStateService,
  EmailSyncBroadcastService, EmailSyncEmailMapperService,
  EmailSyncMessageStoreService, EmailSyncPollService,
} from './services/email-sync-split-index';
import { EmailSendQueueService, EmailSendWorkerService } from './services/queue/email-send-split-index';
import { EmailIdempotencyService, IdempotencyStoreService } from './services/idempotency-split-index';
import { EmailReputationService, EmailReputationStoreService } from './services/email-reputation-split-index';
import { AbuseDetectionService, AbuseDetectionStoreService } from './services/abuse-detection-split-index';
import { EmailAuditService } from './services/email-audit.service';
import { ConversationService, ConversationStoreService } from './services/conversation-split-index';
import { RetentionPolicyService } from './services/retention-policy.service';
import { LegalHoldService } from './services/legal-hold.service';

export const emailProviders = [
  EmailDomainService, EmailMailboxService, MailboxCrudService, MailboxAccessService,
  EmailAliasService, EmailSenderIdentityService, EmailApiKeyService, EmailMessageService,
  EmailTemplateService, EmailTemplateCrudService, EmailTemplateRenderService,
  EmailTrackingService, EmailTrackingStoreService, EmailMetricsService,
  BounceParserService, BounceRuleMatcherService,
  EmailWebhookSubscriptionService, EmailWebhookSubscriptionCrudService, EmailWebhookDispatchService,
  EmailInboundService, EmailCatchallCrudService, EmailCatchallDeliveryService, SmtpSendService, SmtpSendPrecheckService,
  BounceHandlerService, RateLimitService,
  EmailRateLimitService, EmailRateLimitStoreService, EmailRateLimitCheckerService,
  MailboxCleanupService, DomainCleanupService,
  MailDnsService, DkimService,
  StalwartJmapService, StalwartAccountService, StalwartIdentityService,
  StalwartEmailProvider, { provide: EMAIL_PROVIDER, useExisting: StalwartEmailProvider },
  WebhookService, EmailMailboxListService, EmailBootstrapService, PlatformMailService,
  PlatformMailboxMessageService, PlatformMailboxMessageQueryService, PlatformMailboxMessageQueryHelpers,
  PlatformMailboxMessageActionService, PlatformMailboxJmapClientService,
  AttachmentConfigService, AttachmentConfigCrudService, AttachmentConfigValidationService,
  AttachmentStorageService, AttachmentStorageS3Service, AttachmentExtractInboundService,
  EmailAttachmentListener,
  EmailSyncService, EmailSyncPullService, EmailSyncStateService, EmailSyncBroadcastService,
  EmailSyncEmailMapperService, EmailSyncMessageStoreService, EmailSyncPollService,
  EmailSendQueueService, EmailSendWorkerService,
  EmailIdempotencyService, IdempotencyStoreService,
  EmailReputationService, EmailReputationStoreService,
  AbuseDetectionService, AbuseDetectionStoreService,
  EmailAuditService, ConversationService, ConversationStoreService,
  RetentionPolicyService, LegalHoldService,
];
