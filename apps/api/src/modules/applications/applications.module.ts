import { Module } from '@nestjs/common';
import { DomainsModule } from '@/modules/domains/domains.module';
import { ApplicationCatalogueService } from './services/application-catalogue.service';
import { ApplicationInstallService } from './services/application-install.service';
import { ApplicationDnsService } from './services/application-dns.service';
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
  imports: [DomainsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationCatalogueService, ApplicationInstallService, ApplicationDnsService],
  exports: [ApplicationCatalogueService, ApplicationInstallService],
})
export class ApplicationsModule {}
