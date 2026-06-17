import { Module } from '@nestjs/common';
import {
  EmailController,
  EmailInboundController,
  EmailEventsController,
} from './email.controller';
import { EmailService } from './email.service';
import { MailDnsService } from './mail-dns.service';
import { StalwartJmapService } from './stalwart-jmap.service';
import { WebhookService } from './webhook.service';
import { DomainsModule } from '../domains/domains.module';

@Module({
  imports: [DomainsModule],
  controllers: [
    EmailController,
    EmailInboundController,
    EmailEventsController,
  ],
  providers: [EmailService, MailDnsService, StalwartJmapService, WebhookService],
  exports: [EmailService, MailDnsService, StalwartJmapService, WebhookService],
})
export class EmailModule {}
