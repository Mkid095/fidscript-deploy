import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { DatabasesModule } from '@/modules/databases/databases.module';
import { InstantModule } from '@/modules/instant/instant.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { EmailModule } from '@/modules/email/email.module';
import { CryptoModule } from '@/modules/crypto/crypto.module';
import { ProjectHealthController } from './project-health.controller';
import { ProjectHealthService } from './project-health.service';
import { DeploymentHealthChecker } from './checkers/deployment.checker';
import { DatabaseHealthChecker } from './checkers/database.checker';
import { InstantDbHealthChecker } from './checkers/instantdb.checker';
import { DomainsHealthChecker } from './checkers/domains.checker';
import { EmailHealthChecker } from './checkers/email.checker';
import { CronHealthChecker } from './checkers/cron.checker';
import { FunctionsHealthChecker } from './checkers/functions.checker';
import { StorageHealthChecker } from './checkers/storage.checker';

/**
 * Project health: one read-only aggregation over the services' own state.
 *
 * Every probe is a source the service module already maintains — Docker for
 * deployments, each database's pool for PostgreSQL, the reconciliation
 * engine's verdict for domains, the SMTP probe for mail, the scheduler's
 * heartbeat for cron. This module adds no records, no timers, no second
 * monitoring system; it only reads, bounds and rolls up.
 *
 * PrismaService and RedisService are global; the checkers' dependencies
 * come from the modules named below. AuthModule is forward-referenced: the
 * project-scoped guards resolve the same way the monitoring module's do.
 */
@Module({
  imports: [
    forwardRef(() => AuthModule),
    DatabasesModule,
    InstantModule,
    StorageModule,
    EmailModule,
    CryptoModule,
  ],
  controllers: [ProjectHealthController],
  providers: [
    ProjectHealthService,
    DeploymentHealthChecker,
    DatabaseHealthChecker,
    InstantDbHealthChecker,
    DomainsHealthChecker,
    EmailHealthChecker,
    CronHealthChecker,
    FunctionsHealthChecker,
    StorageHealthChecker,
  ],
  exports: [ProjectHealthService],
})
export class ProjectHealthModule {}
