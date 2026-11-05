import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { InstantClientService } from './services/instant-client.service';
import { InstantProvisioningService } from './services/instant-provisioning.service';
import { InstantAppConfigService } from './services/instant-app-config.service';
import { InstantController } from './controllers/instant.controller';

/**
 * The Instant BaaS integration — the project's data plane.
 *
 * Instant owns the app's tables, users, permissions and files; the platform
 * owns where the app runs. This module is the seam between the two: it
 * provisions the Instant app for a project and holds the credential that
 * administers it.
 */
@Module({
  // The guard on these routes resolves a JWT, and the JwtService comes from
  // the auth module.
  imports: [forwardRef(() => AuthModule)],
  controllers: [InstantController],
  providers: [InstantClientService, InstantProvisioningService, InstantAppConfigService],
  exports: [InstantClientService, InstantProvisioningService, InstantAppConfigService],
})
export class InstantModule {}
