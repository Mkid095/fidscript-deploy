import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RegistryModule } from './modules/registry/registry.module';
import { EventsModule } from './modules/events/events.module';
import { AuditModule } from './modules/audit/audit.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppAuthModule } from './modules/app-auth/app-auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { DatabasesModule } from './modules/databases/databases.module';
import { DomainsModule } from './modules/domains/domains.module';
import { EmailModule } from './modules/email/email.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { FunctionsModule } from './modules/functions/functions.module';
import { QueuesModule } from './modules/queues/queues.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { LoggingModule } from './modules/logging/logging.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AIModule } from './modules/ai/ai.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RegistryModule,
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
