import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainVerificationChecksService } from './domain-verification-checks.service';

@Injectable()
export class DomainVerificationService {
  private readonly logger = new Logger(DomainVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private checks: DomainVerificationChecksService,
  ) {}

  async verify(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const currentStatus = domain.dnsStatus as string;

    if (currentStatus === 'PENDING' || currentStatus === 'OWNERSHIP_PENDING') {
      const ownershipOk = await this.checks.checkOwnership(domain);
      if (!ownershipOk) {
        await this.prisma.domain.update({
          where: { id: domainId },
          data: { dnsStatus: 'OWNERSHIP_PENDING' },
        });
        await this.emit(domainId, projectId, userId, 'domain.pending_ownership', { domain: domain.domain });
        const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
        return this.formatDomain(updated!);
      }
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'VALIDATING' },
      });
    }

    if (currentStatus === 'OWNERSHIP_PENDING' || currentStatus === 'VALIDATING') {
      const [dnsPropagation, dnsResolution] = await Promise.all([
        this.checks.checkDnsPropagation(domain),
        this.checks.checkDnsResolution(domain),
      ]);
      if (!dnsPropagation || !dnsResolution) {
        await this.failDomain(domainId, projectId, 'DNS propagation or resolution check failed');
        const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
        return this.formatDomain(updated!);
      }
    }

    const routingOk = await this.checks.checkHttpRouting(domain);
    if (!routingOk) {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'FAILED', routingVerifiedAt: null },
      });
      await this.emit(domainId, projectId, userId, 'domain.failed', {
        reason: 'HTTP routing check failed',
        domain: domain.domain,
      });
      const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
      return this.formatDomain(updated!);
    }

    await this.prisma.domain.update({
      where: { id: domainId },
      data: {
        dnsStatus: 'TLS_PENDING',
        dnsVerifiedAt: new Date(),
        routingVerifiedAt: new Date(),
        sslStatus: domain.sslEnabled ? 'ISSUING' : 'PENDING',
      },
    });
    await this.emit(domainId, projectId, userId, 'domain.tls_pending', {
      domain: domain.domain,
      message: 'DNS + routing confirmed. SSL certificate in flight via Traefik ACME.',
    });

    return this.formatDomain(await this.prisma.domain.findUnique({ where: { id: domainId } }));
  }

  private async failDomain(domainId: string, projectId: string, reason: string) {
    await this.prisma.domain.update({
      where: { id: domainId },
      data: { dnsStatus: 'FAILED' },
    });
    await this.emit(domainId, projectId, '', 'domain.failed', { reason });
  }

  private async checkAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return false;
    if (project.ownerId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!member;
  }

  private formatDomain(domain: any) {
    return {
      id: domain.id,
      projectId: domain.projectId,
      deploymentId: domain.deploymentId || null,
      domain: domain.domain,
      isCustom: domain.isCustom,
      isPrimary: domain.isPrimary,
      apexDomain: domain.apexDomain,
      dnsMode: domain.dnsMode,
      redirectMode: domain.redirectMode,
      sslEnabled: domain.sslEnabled,
      sslStatus: domain.sslStatus?.toLowerCase() ?? 'pending',
      dnsStatus: domain.dnsStatus?.toLowerCase() ?? 'pending',
      dnsVerifiedAt: domain.dnsVerifiedAt,
      routingVerifiedAt: domain.routingVerifiedAt,
      sslExpiresAt: domain.sslExpiresAt,
    };
  }

  private async emit(domainId: string, projectId: string, userId: string, type: string, payload: Record<string, unknown>) {
    await this.eventService.emit(
      type as any,
      projectId,
      { domainId, ...payload },
      { actorId: userId || undefined, actorType: 'user', resourceType: 'domain', resourceId: domainId },
    );
  }
}
