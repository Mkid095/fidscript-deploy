import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { DeploymentsModule } from '@/modules/deployments/deployments.module';
import { DomainsModule } from '@/modules/domains/domains.module';
import { InstantModule } from '@/modules/instant/instant.module';
import { ApplicationCatalogueService } from './services/application-catalogue.service';
import { RegistryCatalogueService } from './services/registry-catalogue.service';
import { ApplicationInstallService } from './services/application-install.service';
import { ApplicationDnsService } from './services/application-dns.service';
import { ApplicationJobsService } from './services/application-jobs.service';
import { ApplicationRuntimeService } from './services/application-runtime.service';
import { RegistryConfigService } from './services/registry-config.service';
import { RegistryAccountService } from './services/registry-account.service';
import { VerdaccioRegistryProvider } from './services/registry-provider/verdaccio.provider';
import { PlatformCredentialsService } from './services/platform-credentials.service';
import { ApplicationsController } from './controllers/applications.controller';
import { PlatformCredentialsController } from './controllers/platform-credentials.controller';
import { AuthRegistryController } from './controllers/auth-registry.controller';

/**
 * The applications an operator can have on a platform.
 *
 * The platform itself is the deployment engine and the mail server — those
 * are always there. The rest are add-ons the operator installs from the
 * Applications screen, and this module is what makes that possible: it lists
 * what is there, and it runs the installer's own command to add more.
 */
@Module({
  // The domains module brings the Cloudflare provider, which publishes an
  // application's DNS records when it is installed.
  imports: [
    DomainsModule,
    // The guard on these routes resolves a JWT, and the JwtService comes
    // from the auth module.
    forwardRef(() => AuthModule),
    // For the shell runner: an install runs the installer's own commands.
    DeploymentsModule,
    // The credentials screen says what InstantDB answers with, and holds
    // the client that proves the platform's token works.
    InstantModule,
  ],
  controllers: [ApplicationsController, PlatformCredentialsController, AuthRegistryController],
  providers: [
    ApplicationCatalogueService,
    RegistryCatalogueService,
    ApplicationInstallService,
    ApplicationDnsService,
    ApplicationJobsService,
    ApplicationRuntimeService,
    // The registry's scope access rules: who may read a scope without a
    // token, and the config rewrite that makes the registry honour it.
    RegistryConfigService,
    // The registry's own account, linked to the platform's user: the password
    // the platform generates, encrypted, and the token it mints with it.
    RegistryAccountService,
    // The registry's wire protocol behind the provider seam: the platform's
    // one concrete registry is Verdaccio, and the account service speaks to
    // it only through this.
    VerdaccioRegistryProvider,
    // The credentials screen: what each application answers with, and the
    // way to make it answer with the platform's own identity.
    PlatformCredentialsService,
  ],
  exports: [ApplicationCatalogueService, ApplicationInstallService],
})
export class ApplicationsModule {}
