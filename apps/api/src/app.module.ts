import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { RedisModule } from './modules/redis/redis.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AppAuthModule } from './modules/app-auth/app-auth.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { DeploymentsModule } from './modules/deployments/deployments.module.js';
import { DatabasesModule } from './modules/databases/databases.module.js';
import { DomainsModule } from './modules/domains/domains.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { FunctionsModule } from './modules/functions/functions.module.js';
import { QueuesModule } from './modules/queues/queues.module.js';
import { SchedulerModule } from './modules/scheduler/scheduler.module.js';
import { MonitoringModule } from './modules/monitoring/monitoring.module.js';
import { LoggingModule } from './modules/logging/logging.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';
import { AIModule } from './modules/ai/ai.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventsModule,
    AuditModule,
    RedisModule,
    HealthModule,
    StorageModule,
    AuthModule,
    AppAuthModule,
    ProjectsModule,
    DeploymentsModule,
    DatabasesModule,
    DomainsModule,
    EmailModule,
    RealtimeModule,
    FunctionsModule,
    QueuesModule,
    SchedulerModule,
    MonitoringModule,
    LoggingModule,
    TemplatesModule,
    AIModule,
    MarketplaceModule,
  ],
})
export class AppModule {}
