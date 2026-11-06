import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DomainListService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, projectId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domains = await this.prisma.domain.findMany({
      where: { projectId },
      include: {
        deployment: { select: { id: true, deploymentUrl: true, status: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return { domains: domains.map(d => this.formatDomain(d)) };
  }

  /**
   * One domain of a project.
   *
   * The SDK and the dashboard both read a single domain — the domain
   * detail screen is built from it — and the route did not exist, so the
   * detail pages silently rendered empty.
   */
  async get(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: {
        deployment: { select: { id: true, deploymentUrl: true, status: true } },
      },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    return this.formatDomain(domain);
  }

  private async checkAccess(userId: string, projectId: string): Promise<boolean> {
    // API-key callers already passed ProjectMemberGuard — allow through.
    if (userId === 'api-key') return true;
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return false;
    if (project.ownerId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!member;
  }

  formatDomain(domain: any) {
    return {
      id: domain.id,
      projectId: domain.projectId,
      deploymentId: domain.deploymentId || null,
      domain: domain.domain,
      isCustom: domain.isCustom,
      isPrimary: domain.isPrimary,
      apexDomain: domain.apexDomain,
      type: domain.type ?? [],
      capabilities: domain.capabilities ?? {
        deployment: false, email: false, inboundEmail: false,
        tracking: false, api: false, redirect: false, sandbox: false,
      },
      dnsMode: domain.dnsMode,
      redirectMode: domain.redirectMode,
      sslEnabled: domain.sslEnabled,
      sslStatus: domain.sslStatus?.toLowerCase() ?? 'pending',
      sslMethod: domain.sslMethod,
      dnsStatus: domain.dnsStatus?.toLowerCase() ?? 'pending',
      dnsVerifiedAt: domain.dnsVerifiedAt,
      routingVerifiedAt: domain.routingVerifiedAt,
      sslExpiresAt: domain.sslExpiresAt,
      sslIssuedAt: domain.sslIssuedAt,
      sslLastCheckedAt: domain.sslLastCheckedAt,
      sslLastError: domain.sslLastError,
      emailWarning: domain.emailWarning,
      emailProvider: domain.emailProvider,
      deploymentUrl: domain.deployment?.deploymentUrl || null,
      createdAt: domain.createdAt,
    };
  }
}
