import { Module } from '@nestjs/common';
import { EmailDomainController } from './email-domain.controller';
import { EmailMailboxController } from './email-mailbox.controller';
import { EmailAliasController } from './email-alias.controller';
import { EmailSenderIdentityController } from './email-sender-identity.controller';
import { EmailApiKeyController } from './email-api-key.controller';
import { EmailMessageController } from './email-message.controller';
import { EmailCatchAllController } from './email-catch-all.controller';
import { EmailInboundController } from './email-inbound.controller';
import { EmailEventsController } from './email-events.controller';
import { EmailService } from './email.service';
import { EmailDomainService } from './domain.service';
import { EmailMailboxService } from './mailbox.service';
import { EmailAliasService } from './alias.service';
import { EmailSenderIdentityService } from './sender-identity.service';
import { EmailApiKeyService } from './api-key.service';
import { EmailMessageService } from './message.service';
import { EmailInboundService } from './inbound.service';
import { SmtpSendService } from './smtp-send.service';
import { BounceHandlerService } from './bounce-handler.service';
import { SieveRebuildService } from './sieve-rebuild.service';
import { RateLimitService } from './rate-limit.service';
import { MailboxCleanupService } from './mailbox-cleanup.service';
import { DomainCleanupService } from './domain-cleanup.service';
import { MailDnsService } from './mail-dns.service';
import { DkimService } from './dkim.service';
import { StalwartJmapService } from './stalwart-core.service';
import { StalwartAccountService } from './stalwart-account.service';
import { StalwartIdentityService } from './stalwart-identity.service';
import { StalwartSieveService } from './stalwart-sieve.service';
import { WebhookService } from './webhook.service';
import { DomainsModule } from '../domains/domains.module';

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
  ],
  exports: [
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
  ],
})
export class EmailModule {}
