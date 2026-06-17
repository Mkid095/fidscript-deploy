import { Injectable } from '@nestjs/common';
import { DomainCrudService } from '@/modules/domains/services/domain-crud.service';
import { DomainVerificationService } from '@/modules/domains/services/domain-verification.service';
import { DomainHealthService } from '@/modules/domains/services/domain-health.service';
import { DomainCleanupService } from '@/modules/domains/services/domain-cleanup.service';
import { DomainDnsService } from '@/modules/domains/services/domain-dns.service';

export { DomainCrudService } from '@/modules/domains/services/domain-crud.service';

@Injectable()
export class DomainsService {
  constructor(
    private crud: DomainCrudService,
    private verification: DomainVerificationService,
    private health: DomainHealthService,
    private cleanup: DomainCleanupService,
    private dns: DomainDnsService,
  ) {}

  list(userId: string, projectId: string) { return this.crud.list(userId, projectId); }
  add(userId: string, projectId: string, dto: any) { return this.crud.add(userId, projectId, dto); }
  getInstructions(userId: string, projectId: string, domainId: string) { return this.crud.getInstructions(userId, projectId, domainId); }
  delete(userId: string, projectId: string, domainId: string) { return this.cleanup.delete(userId, projectId, domainId); }
  connectCloudflare(userId: string, projectId: string, apiToken: string) { return this.dns.connectCloudflare(userId, projectId, apiToken); }
  verify(userId: string, projectId: string, domainId: string) { return this.verification.verify(userId, projectId, domainId); }
  checkHealth(domainId: string) { return this.health.checkHealth(domainId); }
}
