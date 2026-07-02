import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainChecksService } from './domain-checks.service';
import { DomainAccessService } from './domain-access.service';
import { DomainDnsService } from './domain-dns.service';

@Injectable()
export class DomainHealthService {
  private readonly logger = new Logger(DomainHealthService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private checks: DomainChecksService,
    private access: DomainAccessService,
    private dns: DomainDnsService,
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

  private async emit(domainId: string, projectId: string, userId: string, type: string, payload: Record<string, unknown>) {
    await this.eventService.emit(
      type as any,
      projectId,
      { domainId, ...payload },
      { actorId: userId || undefined, actorType: 'user', resourceType: 'domain', resourceId: domainId },
    );
  }

  async getLatestHealth(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const latest = await this.prisma.domainHealthCheck.findFirst({
      where: { domainId },
      orderBy: { checkedAt: 'desc' },
    });
    if (!latest) return null;
    return {
      dnsOk: latest.dnsOk,
      routingOk: latest.routingOk,
      sslOk: latest.sslOk,
      responseTimeMs: latest.responseTimeMs,
      sslExpiresInDays: latest.sslExpiresInDays,
      status: latest.status,
      errorMessage: latest.errorMessage,
      checkedAt: latest.checkedAt,
    };
  }

  async triggerHealthCheck(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({ where: { id: domainId, projectId } });
    if (!domain) throw new NotFoundException('Domain not found');
    // Fire-and-forget async check
    setTimeout(() => {
      this.checkHealth(domainId).catch(err => {
        this.logger.error(`Health check failed for domain ${domainId}: ${err.message}`);
      });
    }, 0);
    return { status: 'checking', message: 'Health check triggered' };
  }

  async getDnsRecords(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } }, dnsConnection: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const records: Array<{
      type: string; name: string; value: string; priority?: number;
      ttl?: number; status: 'ok' | 'missing' | 'pending'; category: 'deployment' | 'email' | 'verification';
    }> = [];
    const isApex = domain.apexDomain;

    // Deployment records
    if (isApex) {
      records.push({ type: 'A', name: '@', value: 'YOUR_SERVER_IP', ttl: 300, status: 'pending', category: 'deployment' });
    } else {
      const slug = this.extractSlug(domain.deployment?.deploymentUrl ?? domain.domain);
      records.push({ type: 'CNAME', name: domain.domain.split('.')[0], value: `${slug}.apps.local`, ttl: 300, status: 'pending', category: 'deployment' });
    }
    records.push({ type: 'TXT', name: `_fidscript-verification.${domain.domain}`, value: `FIDScript verified ${domainId}`, ttl: 300, status: 'pending', category: 'verification' });

    // Email records (MX)
    records.push({ type: 'MX', name: '@', value: `mx1.${domain.domain}`, priority: 10, ttl: 300, status: 'pending', category: 'email' });
    records.push({ type: 'MX', name: '@', value: `mx2.${domain.domain}`, priority: 20, ttl: 300, status: 'pending', category: 'email' });

    // SPF record
    records.push({
      type: 'TXT', name: '@',
      value: `v=spf1 mx include:${domain.domain} ~all`,
      ttl: 300, status: 'pending', category: 'email',
    });

    // DKIM record
    records.push({
      type: 'TXT', name: `default._domainkey.${domain.domain}`,
      value: 'v=DKIM1; k=ed25519; p=...',
      ttl: 300, status: 'pending', category: 'email',
    });

    // DMARC record
    records.push({
      type: 'TXT', name: '_dmarc',
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@fidscript.dev',
      ttl: 300, status: 'pending', category: 'email',
    });

    return { domainId, domain: domain.domain, records };
  }

  async autoConfigureDnsRecords(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } }, dnsConnection: true },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    if (domain.dnsMode !== 'cloudflare_auto') throw new ConflictException('Domain is not in Cloudflare auto mode');
    if (!domain.dnsConnection) throw new ConflictException('No Cloudflare connection found for this domain');

    return this.dns.cloudflareAutoSetup(
      domainId,
      domain.domain,
      domain.deployment?.deploymentUrl ?? null,
      domain.apexDomain,
      async (d: string) => { return ''; },
      async () => { return {}; },
    );
  }

  private extractSlug(deploymentUrl: string): string {
    try {
      const host = deploymentUrl.replace('https://', '').replace('http://', '').split(':')[0];
      return host.split('.')[0];
    } catch { return 'app'; }
  }
}
