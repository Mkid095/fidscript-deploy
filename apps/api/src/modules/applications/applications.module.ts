import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { DeploymentsModule } from '@/modules/deployments/deployments.module';
import { DomainsModule } from '@/modules/domains/domains.module';
import { ApplicationCatalogueService } from './services/application-catalogue.service';
import { ApplicationInstallService } from './services/application-install.service';
import { ApplicationDnsService } from './services/application-dns.service';
import { ApplicationJobsService } from './services/application-jobs.service';
import { ApplicationRuntimeService } from './services/application-runtime.service';
import { ApplicationsController } from './controllers/applications.controller';

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
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationCatalogueService,
    ApplicationInstallService,
    ApplicationDnsService,
    ApplicationJobsService,
    ApplicationRuntimeService,
  ],
  exports: [ApplicationCatalogueService, ApplicationInstallService],
})
export class ApplicationsModule {}
