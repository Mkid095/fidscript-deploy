import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { DomainsModule } from '@/modules/domains/domains.module';
import { QueuesModule } from '@/modules/queues/queues.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { InfrastructureModule } from '@/modules/infrastructure/infrastructure.module';

import { EmailDomainController } from './controllers/email-domain.controller';
import { EmailMailboxController } from './controllers/email-mailbox.controller';
import { EmailAliasController } from './controllers/email-alias.controller';
import { EmailSenderIdentityController } from './controllers/email-sender-identity.controller';
import { EmailApiKeyController } from './controllers/email-api-key.controller';
import { EmailMessageController } from './controllers/email-message.controller';
import { EmailMessageListController } from './controllers/email-message-list.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { EmailTemplateActionController } from './controllers/email-template-action.controller';
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

import { emailProviders } from './email-module.providers';

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
    EmailDomainController, EmailMailboxController, EmailAliasController,
    EmailSenderIdentityController, EmailApiKeyController, EmailMessageController,
    EmailMessageListController, EmailTemplateController, EmailTemplateActionController,
    EmailCatchAllController, EmailInboundController, EmailEventsController,
    PlatformMailboxController, PlatformAdminMailController, AttachmentConfigController,
    MailConnectionController, EmailTrackingController, EmailWebhookSubscriptionController,
    EmailAnalyticsController, EmailStatusController,
  ],
  providers: emailProviders,
  exports: emailProviders,
})
export class EmailModule {}
