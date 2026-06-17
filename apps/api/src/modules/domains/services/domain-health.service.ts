import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainChecksService } from './domain-checks.service';

@Injectable()
export class DomainHealthService {
  private readonly logger = new Logger(DomainHealthService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private checks: DomainChecksService,
  ) {}

  async checkHealth(domainId: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) return;
    if (!['TLS_PENDING', 'ACTIVE', 'BROKEN'].includes(domain.dnsStatus as string)) return;

    const start = Date.now();
    let dnsOk = false;
    let routingOk = false;
    let sslOk = false;
    let sslExpiresInDays: number | null = null;
    let errorMessage = '';

    try {
      [dnsOk, routingOk, sslOk, sslExpiresInDays] = await Promise.all([
        this.checks.checkDnsPropagation(domain),
        this.checks.checkHttpRouting(domain),
        this.checks.checkSsl(domain),
        this.checks.getSslExpiresInDays(domain),
      ]);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const responseTimeMs = Date.now() - start;
    let healthStatus: 'ok' | 'degraded' | 'broken' = 'ok';
    if (!dnsOk || !routingOk) healthStatus = 'broken';
    else if (!sslOk) healthStatus = 'degraded';

    await this.prisma.domainHealthCheck.create({
      data: {
        domainId,
        dnsOk,
        routingOk,
        sslOk,
        responseTimeMs,
        sslExpiresInDays,
        status: healthStatus,
        errorMessage: errorMessage || null,
      },
    });

    await this.prisma.domain.update({
      where: { id: domainId },
      data: {
        sslLastCheckedAt: new Date(),
        sslExpiresAt: sslExpiresInDays != null
          ? new Date(Date.now() + sslExpiresInDays * 86_400_000)
          : undefined,
        sslLastError: sslOk ? null : (errorMessage || 'SSL check failed'),
      },
    });

    const currentStatus = domain.dnsStatus as string;

    if (sslOk && currentStatus === 'TLS_PENDING') {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'ACTIVE', sslStatus: 'ACTIVE', sslIssuedAt: new Date() },
      });
      await this.emit(domainId, domain.projectId, '', 'domain.verified', { domain: domain.domain });
      this.logger.log(`[domains] Domain ${domain.domain} reached ACTIVE (SSL confirmed)`);
      return;
    }

    if (!routingOk && currentStatus === 'ACTIVE') {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'BROKEN' },
      });
      await this.emit(domainId, domain.projectId, '', 'domain.broken', { domain: domain.domain, error: errorMessage });
      this.logger.warn(`[domains] Domain ${domain.domain} went BROKEN: ${errorMessage}`);
      return;
    }

    if (routingOk && sslOk && currentStatus === 'BROKEN') {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'ACTIVE' },
      });
      await this.emit(domainId, domain.projectId, '', 'domain.recovered', { domain: domain.domain });
      this.logger.log(`[domains] Domain ${domain.domain} recovered to ACTIVE`);
    }
  }

  private async emit(domainId: string, projectId: string, userId: string, type: string, metadata: Record<string, unknown>) {
    await this.eventService.emit(type as any, {
      id: `${domainId}-${Date.now()}`,
      type,
      timestamp: new Date(),
      actorId: userId || undefined,
      actorType: 'user',
      resourceType: 'domain',
      resourceId: domainId,
      metadata: { domainId, projectId, ...metadata },
    });
  }
}
