import { Module, forwardRef } from '@nestjs/common';
import { SecretsService } from './secrets/secrets.service';
import { CredentialsService } from './credentials/credentials.service';
import { DomainPrimitive } from './primitives/domain.primitive';
import { CloudflarePrimitive } from './primitives/cloudflare.primitive';
import { EmailPrimitive } from './primitives/email.primitive';
import { InfrastructureService } from './infrastructure.service';
import { ProvisioningService } from './provisioning.service';
import { PlatformBackupService } from './services/platform-backup.service';
import { PlatformBackupSchedulerService } from './services/platform-backup-scheduler.service';
import { DomainsModule } from '@/modules/domains/domains.module';
import { DatabasesModule } from '@/modules/databases/databases.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { RedisModule } from '@/modules/redis/redis.module';

/**
 * InfrastructureModule — the project's source of truth.
 *
 * ProjectCloudflareProvider is intentionally NOT in the providers list:
 * it's instantiated on-demand by CloudflarePrimitive with a per-project
 * OAuth token, not managed by Nest's DI.
 */
@Module({
  imports: [
    DomainsModule,
    forwardRef(() => DatabasesModule),
    StorageModule,
    RedisModule,
  ],
  providers: [
    SecretsService,
    CredentialsService,
    DomainPrimitive,
    CloudflarePrimitive,
    EmailPrimitive,
    InfrastructureService,
    ProvisioningService,
    PlatformBackupService,
    PlatformBackupSchedulerService,
  ],
  exports: [
    SecretsService,
    CredentialsService,
    DomainPrimitive,
    CloudflarePrimitive,
    EmailPrimitive,
    InfrastructureService,
    ProvisioningService,
    PlatformBackupService,
  ],
})
export class InfrastructureModule {}
