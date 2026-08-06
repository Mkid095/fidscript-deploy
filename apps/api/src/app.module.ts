import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RegistryModule } from './modules/registry/registry.module';
import { EventsModule } from './modules/events/events.module';
import { AuditModule } from './modules/audit/audit.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { VerificationModule } from './modules/verification/verification.module';
import { StorageModule } from './modules/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailVerifiedGuard } from './modules/auth/guards/email-verified.guard';
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
import { CryptoModule } from './modules/crypto/crypto.module';
import { InstallationModule } from './modules/installation/installation.module';
import { McpModule } from './modules/mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CryptoModule,
    McpModule,
    PrismaModule,
    RegistryModule,
    EventsModule,
    AuditModule,
    RedisModule,
    HealthModule,
    VerificationModule,
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
    InstallationModule,
  ],
  providers: [
    // Global guard: every authenticated request must have a verified email
    // unless the route is on the AuthController (verification/recovery flow).
    // Registered here rather than in AuthModule so the guard is wired up
    // before AppModule is fully constructed.
    { provide: APP_GUARD, useClass: EmailVerifiedGuard },
  ],
})
export class AppModule {}
