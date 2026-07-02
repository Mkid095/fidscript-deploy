import { Injectable } from '@nestjs/common';
import { DomainCrudService } from '@/modules/domains/services/domain-crud.service';
import { DomainVerificationService } from '@/modules/domains/services/domain-verification.service';
import { DomainHealthService } from '@/modules/domains/services/domain-health.service';
import { DomainCleanupService } from '@/modules/domains/services/domain-cleanup.service';
import { DomainDnsService } from '@/modules/domains/services/domain-dns.service';
import { DomainConnectionService } from '@/modules/domains/services/domain-connection.service';
import { DomainSslService } from '@/modules/domains/services/domain-ssl.service';

export { DomainCrudService } from '@/modules/domains/services/domain-crud.service';

@Injectable()
export class DomainsService {
  constructor(
    private crud: DomainCrudService,
    private verification: DomainVerificationService,
    private health: DomainHealthService,
    private cleanup: DomainCleanupService,
    private dns: DomainDnsService,
    private connection: DomainConnectionService,
    private ssl: DomainSslService,
  ) {}

  list(userId: string, projectId: string) {
    return this.crud.list(userId, projectId);
  }

  add(userId: string, projectId: string, dto: any) {
    return this.crud.add(userId, projectId, dto);
  }

  getInstructions(userId: string, projectId: string, domainId: string) {
    return this.crud.getInstructions(userId, projectId, domainId);
  }

  connectCloudflare(userId: string, projectId: string, apiToken: string) {
    return this.dns.connectCloudflare(userId, projectId, apiToken);
  }

  getConnection(userId: string, projectId: string) {
    return this.connection.getConnection(userId, projectId);
  }

  delete(userId: string, projectId: string, domainId: string) {
    return this.cleanup.delete(userId, projectId, domainId);
  }

  verify(userId: string, projectId: string, domainId: string) {
    return this.verification.verify(userId, projectId, domainId);
  }

  checkHealth(domainId: string) {
    return this.health.checkHealth(domainId);
  }

  getHealth(userId: string, projectId: string, domainId: string) {
    return this.health.getLatestHealth(userId, projectId, domainId);
  }

  triggerHealthCheck(userId: string, projectId: string, domainId: string) {
    return this.health.triggerHealthCheck(userId, projectId, domainId);
  }

  getDnsRecords(userId: string, projectId: string, domainId: string) {
    return this.health.getDnsRecords(userId, projectId, domainId);
  }

  autoConfigureDnsRecords(userId: string, projectId: string, domainId: string) {
    return this.health.autoConfigureDnsRecords(userId, projectId, domainId);
  }

  getSsl(userId: string, projectId: string, domainId: string) {
    return this.ssl.getSsl(userId, projectId, domainId);
  }

  renewSsl(userId: string, projectId: string, domainId: string) {
    return this.ssl.renewSsl(userId, projectId, domainId);
  }

  reissueSsl(userId: string, projectId: string, domainId: string) {
    return this.ssl.reissueSsl(userId, projectId, domainId);
  }
}
