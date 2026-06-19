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
import { EmailService } from './email.service';
import { EmailDomainService } from './services/domain.service';
import { EmailMailboxService } from './services/mailbox.service';
import { EmailAliasService } from './services/alias.service';
import { EmailSenderIdentityService } from './services/sender-identity.service';
import { EmailApiKeyService } from './services/api-key.service';
import { EmailMessageService } from './services/message.service';
import { EmailInboundService } from './services/inbound.service';
import { SmtpSendService } from './smtp/smtp-send.service';
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

@Module({
  imports: [DomainsModule],
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
    WebhookService,
    EmailMailboxListService,
    EmailBootstrapService,
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
    WebhookService,
  ],
})
export class EmailModule {}
