import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainAccessService } from './domain-access.service';
import { DomainChecksService } from './domain-checks.service';
import { DomainReconciliationQueueService } from './domain-reconciliation-queue.service';

@Injectable()
export class DomainSslService {
  private readonly logger = new Logger(DomainSslService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private access: DomainAccessService,
    private checks: DomainChecksService,
    private reconciliation: DomainReconciliationQueueService,
  ) {}

  async getSsl(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });
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
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (!domain.sslEnabled)
      throw new NotFoundException('SSL is not enabled for this domain');

    // Traefik is the only ACME client. What this does: knock on the domain
    // so the request starts (or the renewal happens), then ask the
    // reconciler to verify — the real HTTPS check writes what is true, and
    // nothing here claims a certificate that was not confirmed.
    await this.prisma.domain.update({
      where: { id: domainId },
      data: { sslStatus: 'ISSUING', sslLastError: null },
    });

    await this.emit(domainId, projectId, userId, 'domains.ssl_renewing', {
      domain: domain.domain,
    });

    await this.checks.prewarmCertificate(domain.domain);
    try {
      await this.reconciliation.enqueue(domainId, 'ssl_expiry');
    } catch (err) {
      this.logger.warn(
        `Could not enqueue SSL verification for ${domainId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      status: 'renewing',
      message:
        'Renewal asked for — the domain is verified against its live certificate, and the state says what was found.',
    };
  }

  async reissueSsl(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (!domain.sslEnabled)
      throw new NotFoundException('SSL is not enabled for this domain');

    await this.prisma.domain.update({
      where: { id: domainId },
      data: { sslStatus: 'ISSUING', sslLastError: null },
    });

    await this.emit(domainId, projectId, userId, 'domains.ssl_reissued', {
      domain: domain.domain,
    });

    await this.checks.prewarmCertificate(domain.domain);
    try {
      await this.reconciliation.enqueue(domainId, 'manual');
    } catch (err) {
      this.logger.warn(
        `Could not enqueue SSL verification for ${domainId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      status: 'reissuing',
      message:
        'Reissue asked for — the domain is verified against its live certificate, and the state says what was found.',
    };
  }

  private async emit(
    domainId: string,
    projectId: string,
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ) {
    await this.eventService.emit(
      type as any,
      projectId,
      { domainId, ...payload },
      {
        actorId: userId,
        actorType: 'user',
        resourceType: 'domain',
        resourceId: domainId,
      },
    );
  }
}
