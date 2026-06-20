import { Module } from '@nestjs/common';
import { InstallationController } from './installation.controller';
import { InstallationOrchestratorService } from './installation.service';
import { TraefikProxyProvider } from './providers/traefik-proxy.provider';
import { TraefikCertProvider } from './providers/traefik-cert.provider';
import { DnsStep, ProxyStep, CertificateStep, EmailStep, HealthStep } from './steps/installation-steps';
import { DomainsModule } from '@/modules/domains/domains.module';
import { EmailModule } from '@/modules/email/email.module';

@Module({
  imports: [DomainsModule, EmailModule],
  controllers: [InstallationController],
  providers: [
    InstallationOrchestratorService,
    TraefikProxyProvider,
    TraefikCertProvider,
    DnsStep,
    ProxyStep,
    CertificateStep,
    EmailStep,
    HealthStep,
  ],
  exports: [InstallationOrchestratorService],
})
export class InstallationModule {}
