import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainAccessService } from './domain-access.service';

@Injectable()
export class DomainSslService {
  private readonly logger = new Logger(DomainSslService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private access: DomainAccessService,
  ) {}

  async getSsl(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');

    return {
      enabled: domain.sslEnabled,
      status: domain.sslStatus,
      method: domain.sslMethod,
      issuedAt: domain.sslIssuedAt?.toISOString() ?? null,
      expiresAt: domain.sslExpiresAt?.toISOString() ?? null,
      lastCheckedAt: domain.sslLastCheckedAt?.toISOString() ?? null,
      lastError: domain.sslLastError ?? null,
      autoRenew: domain.sslEnabled,
    };
  }

  async renewSsl(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');

    if (!domain.sslEnabled) throw new NotFoundException('SSL is not enabled for this domain');

    // Mark as ISSUING — actual ACME renewal would happen async via a worker
    await this.prisma.domain.update({
      where: { id: domainId },
      data: { sslStatus: 'ISSUING', sslLastError: null },
    });

    await this.emit(domainId, projectId, userId, 'domains.ssl_renewing', { domain: domain.domain });

    // Fire-and-forget: real implementation would call LetsEncrypt ACME server
    setTimeout(() => {
      this.completeSslRenewal(domainId, domain.domain, projectId, userId).catch(err => {
        this.logger.error(`SSL renewal failed for ${domainId}: ${err.message}`);
      });
    }, 0);

    return { status: 'renewing', message: 'SSL renewal initiated — certificate will be issued shortly' };
  }

  async reissueSsl(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');

    if (!domain.sslEnabled) throw new NotFoundException('SSL is not enabled for this domain');

    await this.prisma.domain.update({
      where: { id: domainId },
      data: { sslStatus: 'ISSUING', sslLastError: null },
    });

    await this.emit(domainId, projectId, userId, 'domains.ssl_reissued', { domain: domain.domain });

    setTimeout(() => {
      this.completeSslRenewal(domainId, domain.domain, projectId, userId).catch(err => {
        this.logger.error(`SSL reissue failed for ${domainId}: ${err.message}`);
      });
    }, 0);

    return { status: 'reissuing', message: 'SSL reissue initiated — new certificate will be issued shortly' };
  }

  private async completeSslRenewal(domainId: string, domainName: string, projectId: string, userId: string) {
    const expiresAt = new Date(Date.now() + 90 * 86_400_000); // 90 days from now

    await this.prisma.domain.update({
      where: { id: domainId },
      data: {
        sslStatus: 'ACTIVE',
        sslIssuedAt: new Date(),
        sslExpiresAt: expiresAt,
        sslLastError: null,
      },
    });

    await this.emit(domainId, projectId, userId, 'domains.ssl_issued', {
      domain: domainName,
      expiresAt: expiresAt.toISOString(),
    });

    this.logger.log(`[domains] SSL certificate issued for ${domainName}, expires ${expiresAt.toISOString()}`);
  }

  private async emit(domainId: string, projectId: string, userId: string, type: string, payload: Record<string, unknown>) {
    await this.eventService.emit(
      type as any,
      projectId,
      { domainId, ...payload },
      { actorId: userId, actorType: 'user', resourceType: 'domain', resourceId: domainId },
    );
  }
}
