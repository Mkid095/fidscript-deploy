import { Module } from '@nestjs/common';
import { EmailDomainController } from './controllers/email-domain.controller';
import { EmailMailboxController } from './controllers/email-mailbox.controller';
import { EmailAliasController } from './controllers/email-alias.controller';
import { EmailSenderIdentityController } from './controllers/email-sender-identity.controller';
import { EmailApiKeyController } from './controllers/email-api-key.controller';
import { EmailMessageController } from './controllers/email-message.controller';
import { EmailCatchAllController } from './controllers/email-catch-all.controller';
import { EmailInboundController } from './controllers/email-inbound.controller';
import { EmailEventsController } from './controllers/email-events.controller';
import { PlatformMailboxController } from './controllers/platform-mailbox-message.controller';
import { PlatformAdminMailController } from './controllers/platform-admin-mail.controller';
import { AttachmentConfigController } from './controllers/attachment-config.controller';
import { EmailService } from './email.service';
import { EmailDomainService } from './services/domain.service';
import { EmailMailboxService } from './services/mailbox.service';
import { EmailAliasService } from './services/alias.service';
import { EmailSenderIdentityService } from './services/sender-identity.service';
import { EmailApiKeyService } from './services/api-key.service';
import { EmailMessageService } from './services/message.service';
import { EmailInboundService } from './services/inbound.service';
import { SmtpSendService } from './smtp/smtp-send.service';
import { PlatformMailService } from './platform-mail.service';
import { BounceHandlerService } from './services/bounce-handler.service';
import { SieveRebuildService } from './services/sieve-rebuild.service';
import { RateLimitService } from './services/rate-limit.service';
import { MailboxCleanupService } from './services/mailbox-cleanup.service';
import { DomainCleanupService } from './services/domain-cleanup.service';
import { MailDnsService } from './dns/mail-dns.service';
import { DkimService } from './dns/dkim.service';
import { StalwartJmapService } from './stalwart/stalwart-core.service';
import { StalwartAccountService } from './stalwart/stalwart-account.service';
import { StalwartIdentityService } from './stalwart/stalwart-identity.service';
import { StalwartSieveService } from './stalwart/stalwart-sieve.service';
import { WebhookService } from './services/webhook.service';
import { EmailMailboxListService } from './services/email-mailbox-crud.service';
import { EmailBootstrapService } from './services/email-bootstrap.service';
import { DomainsModule } from '@/modules/domains/domains.module';
import { QueuesModule } from '@/modules/queues/queues.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { IEmailProvider, EMAIL_PROVIDER } from './providers/i-email-provider';
import { StalwartEmailProvider } from './providers/stalwart-email.provider';
import { PlatformMailboxMessageService } from './services/platform-mailbox-message.service';
import { AttachmentConfigService } from './services/attachment-config.service';
import { AttachmentStorageService } from './services/attachment-storage.service';
import { EmailAttachmentListener } from './services/attachment-event-listener.service';

@Module({
  imports: [DomainsModule, QueuesModule, StorageModule],
  controllers: [
    EmailDomainController,
    EmailMailboxController,
    EmailAliasController,
    EmailSenderIdentityController,
    EmailApiKeyController,
    EmailMessageController,
    EmailCatchAllController,
    EmailInboundController,
    EmailEventsController,
    PlatformMailboxController,
    PlatformAdminMailController,
    AttachmentConfigController,
  ],
  providers: [
    EmailService,
    EmailDomainService,
    EmailMailboxService,
    EmailAliasService,
    EmailSenderIdentityService,
    EmailApiKeyService,
    EmailMessageService,
    EmailInboundService,
    SmtpSendService,
    BounceHandlerService,
    SieveRebuildService,
    RateLimitService,
    MailboxCleanupService,
    DomainCleanupService,
    MailDnsService,
    DkimService,
    StalwartJmapService,
    StalwartAccountService,
    StalwartIdentityService,
    StalwartSieveService,
    StalwartEmailProvider,
    {
      // The platform talks to the mail server only through the IEmailProvider
      // interface; the concrete StalwartEmailProvider is the only impl today.
      // Add new providers (M365, Google Workspace) by adding an alternate
      // binding here and switching based on tenant config.
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
  ],
  exports: [
    EmailService,
    EmailDomainService,
    EmailMailboxService,
    EmailMailboxListService,
    EmailAliasService,
    EmailSenderIdentityService,
    EmailApiKeyService,
    EmailMessageService,
    EmailInboundService,
    SmtpSendService,
    BounceHandlerService,
    SieveRebuildService,
    RateLimitService,
    MailboxCleanupService,
    DomainCleanupService,
    MailDnsService,
    DkimService,
    StalwartJmapService,
    StalwartAccountService,
    StalwartIdentityService,
    StalwartSieveService,
    StalwartEmailProvider,
    EMAIL_PROVIDER,
    WebhookService,
    PlatformMailService,
    PlatformMailboxMessageService,
    AttachmentConfigService,
    AttachmentStorageService,
  ],
})
export class EmailModule {}
