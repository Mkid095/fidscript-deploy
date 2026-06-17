import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import * as https from 'https';
import axios from 'axios';

@Injectable()
export class DomainHealthService {
  private readonly logger = new Logger(DomainHealthService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private dnsProvider: DnsProvider,
  ) {}

  /**
   * Background domain health check — called every ~10 minutes by scheduler.
   * Transitions:
   *   TLS_PENDING → ACTIVE  (SSL confirmed serving)
   *   ACTIVE   → BROKEN (any check fails)
   *   BROKEN   → ACTIVE (full recovery on next run)
   */
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
        this.checkDnsPropagation(domain),
        this.checkHttpRouting(domain),
        this.checkSsl(domain),
        this.getSslExpiresInDays(domain),
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

  private async checkDnsPropagation(domain: { domain: string; dnsMode: string }): Promise<boolean> {
    if (domain.dnsMode === 'cloudflare_auto') {
      const zoneId = await this.dnsProvider.getZoneId(domain.domain);
      if (!zoneId) return false;
      const records = await this.dnsProvider.listRecords({ zoneId, name: domain.domain });
      return records.length > 0;
    }
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.domain)}&type=A`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 },
      );
      return (resp.data?.Answer?.length ?? 0) > 0;
    } catch { /* ignore */ }
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short ${domain.domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      return out.length > 0;
    } catch { return false; }
  }

  private async checkHttpRouting(domain: { domain: string }): Promise<boolean> {
    try {
      const response = await axios.get(`http://${domain.domain}/.well-known/fidscript`, {
        timeout: 10_000,
        validateStatus: s => s < 500,
      });
      if (response.status === 200) return true;
      if (response.status === 404 && typeof response.data === 'string' && response.data.includes('fidscript')) return true;
      return response.status < 400 || response.status === 404;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('NXDOMAIN')) return false;
      const axiosErr = err as any;
      if (axiosErr?.response) return true;
      return false;
    }
  }

  private async checkSsl(domain: { domain: string }): Promise<boolean> {
    try {
      const resp = await axios.get(`https://${domain.domain}/.well-known/fidscript`, {
        timeout: 10_000,
        validateStatus: s => s < 500,
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
      });
      return resp.status < 400 || resp.status === 404;
    } catch { return false; }
  }

  private async getSslExpiresInDays(domain: { domain: string }): Promise<number | null> {
    return new Promise(resolve => {
      const req = https.request(
        { hostname: domain.domain, port: 443, path: '/', method: 'HEAD', timeout: 8_000 },
        (res: any) => {
          const cert = res.getPeerCertificate?.();
          if (!cert?.valid_to) { req.destroy(); resolve(null); return; }
          const expiry = new Date(cert.valid_to);
          const days = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
          req.destroy();
          resolve(days);
        },
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    });
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
