import { Module } from '@nestjs/common';
import { SecretsService } from './secrets/secrets.service';
import { CredentialsService } from './credentials/credentials.service';
import { DomainPrimitive } from './primitives/domain.primitive';
import { CloudflarePrimitive } from './primitives/cloudflare.primitive';
import { EmailPrimitive } from './primitives/email.primitive';
import { InfrastructureService } from './infrastructure.service';
import { ProvisioningService } from './provisioning.service';
import { DomainsModule } from '@/modules/domains/domains.module';

/**
 * InfrastructureModule — the project's source of truth.
 *
 * ProjectCloudflareProvider is intentionally NOT in the providers list:
 * it's instantiated on-demand by CloudflarePrimitive with a per-project
 * OAuth token, not managed by Nest's DI.
 */
@Module({
  imports: [DomainsModule],
  providers: [
    SecretsService,
    CredentialsService,
    DomainPrimitive,
    CloudflarePrimitive,
    EmailPrimitive,
    InfrastructureService,
    ProvisioningService,
  ],
  exports: [
    SecretsService,
    CredentialsService,
    DomainPrimitive,
    CloudflarePrimitive,
    EmailPrimitive,
    InfrastructureService,
    ProvisioningService,
  ],
})
export class InfrastructureModule {}
