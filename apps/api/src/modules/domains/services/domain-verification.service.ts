import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import * as https from 'https';
import axios from 'axios';

@Injectable()
export class DomainVerificationService {
  private readonly logger = new Logger(DomainVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private dnsProvider: DnsProvider,
    private configService: ConfigService,
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

    // Step 1: Ownership check (TXT)
    if (currentStatus === 'PENDING' || currentStatus === 'OWNERSHIP_PENDING') {
      const ownershipOk = await this.checkOwnership(domain);
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

    // Step 2: DNS propagation + resolution
    if (currentStatus === 'OWNERSHIP_PENDING' || currentStatus === 'VALIDATING') {
      const [dnsPropagation, dnsResolution] = await Promise.all([
        this.checkDnsPropagation(domain),
        this.checkDnsResolution(domain),
      ]);
      if (!dnsPropagation || !dnsResolution) {
        await this.failDomain(domainId, projectId, 'DNS propagation or resolution check failed');
        const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
        return this.formatDomain(updated!);
      }
    }

    // Step 3: HTTP routing check
    const routingOk = await this.checkHttpRouting(domain);
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

  private async checkOwnership(domain: { domain: string; dnsMode: string }): Promise<boolean> {
    const txtName = `_fidscript-verification.${domain.domain}`;
    const prefix = `FIDScript verified`;
    if (domain.dnsMode === 'cloudflare_auto') {
      const zoneId = await this.dnsProvider.getZoneId(domain.domain);
      if (!zoneId) return false;
      const records = await this.dnsProvider.listRecords({ zoneId, name: txtName, type: 'TXT' });
      return records.some(r => r.content.startsWith(prefix));
    }
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtName)}&type=TXT`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 },
      );
      if (resp.data?.Answer?.length > 0) {
        return resp.data.Answer.some((a: any) =>
          typeof a.data === 'string' && a.data.startsWith(prefix),
        );
      }
    } catch { /* ignore */ }
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short TXT ${txtName} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      return out.includes(prefix);
    } catch { return false; }
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

  private async checkDnsResolution(domain: { domain: string }): Promise<boolean> {
    try {
      const resp = await axios.get(
        `https://cloudflare-dns.com/cdn-cgi/trace?name=${encodeURIComponent(domain.domain)}`,
        { timeout: 8_000 },
      );
      return resp.status === 200;
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
