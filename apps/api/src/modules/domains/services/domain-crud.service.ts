import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainDnsService } from '@/modules/domains/services/domain-dns.service';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import { AddDomainDto } from '@/modules/domains/dto/add-domain.dto';

const PLATFORM_DOMAIN = 'deploy.fidscript.com';

@Injectable()
export class DomainCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private domainDnsService: DomainDnsService,
    private dnsProvider: DnsProvider,
  ) {}

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

  async add(userId: string, projectId: string, dto: AddDomainDto) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const deployment = await this.prisma.deployment.findUnique({ where: { id: dto.deploymentId } });
    if (!deployment || deployment.projectId !== projectId) {
      throw new NotFoundException('Deployment not found in this project');
    }
    if (deployment.status !== 'SUCCESS') {
      throw new ConflictException('Can only add a domain to a successful deployment');
    }

    const existing = await this.prisma.domain.findFirst({ where: { projectId, domain: dto.domain } });
    if (existing) throw new ConflictException('Domain already added to this project');

    const isPlatform = dto.domain.endsWith(`.${PLATFORM_DOMAIN}`);
    const isApex = !dto.domain.startsWith('www.') && dto.domain.split('.').length === 2;

    const mx = await this.checkMxRecords(dto.domain);
    const existingCount = await this.prisma.domain.count({ where: { projectId } });
    const isPrimary = existingCount === 0;

    const domain = await this.prisma.domain.create({
      data: {
        projectId,
        deploymentId: dto.deploymentId,
        domain: dto.domain,
        isCustom: !isPlatform,
        isPrimary,
        apexDomain: isApex,
        dnsMode: dto.dnsMode ?? 'manual',
        redirectMode: dto.redirectMode ?? 'none',
        sslEnabled: dto.sslEnabled ?? true,
        sslStatus: 'PENDING',
        dnsStatus: 'PENDING',
        emailWarning: mx.hasMx,
        emailProvider: mx.provider || null,
      },
    });

    await this.emit(domain.id, projectId, userId, 'domain.added', {
      domain: dto.domain,
      isCustom: !isPlatform,
      emailWarning: mx.hasMx,
      emailProvider: mx.provider,
    });

    const instructions = this.getDnsInstructions(dto.domain, deployment.deploymentUrl, isApex);

    // Mode B: auto-create DNS records
    if (dto.dnsMode === 'cloudflare_auto') {
      try {
        await this.domainDnsService.cloudflareAutoSetup(
          domain.id,
          dto.domain,
          deployment.deploymentUrl,
          isApex,
          async (d) => {
            const zoneId = await this.dnsProvider.getZoneId(d);
            if (!zoneId) throw new Error(`Cloudflare zone for ${d} not found`);
            return zoneId;
          },
          (opts) => this.dnsProvider.createRecord(opts),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.prisma.domain.update({
          where: { id: domain.id },
          data: { dnsStatus: 'FAILED' },
        });
        throw new ConflictException(`Cloudflare auto-setup failed: ${msg}`);
      }
    }

    return {
      domain: this.formatDomain(domain),
      instructions,
      emailWarning: mx.hasMx
        ? {
            detected: true,
            provider: mx.provider,
            message: `Email service detected (${mx.provider}). We will only create CNAME/TXT/A records.`,
          }
        : { detected: false },
    };
  }

  async getInstructions(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    const instructions = this.getDnsInstructions(domain.domain, domain.deployment?.deploymentUrl ?? null, domain.apexDomain);
    return { domain: this.formatDomain(domain), instructions };
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

  private async checkAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return false;
    if (project.ownerId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!member;
  }

  private getDnsInstructions(
    domain: string,
    deploymentUrl: string | null,
    isApex: boolean,
  ): { type: string; name: string; value: string; ttl: number; notes: string }[] {
    const slug = this.extractSlug(deploymentUrl || domain);
    const instructions = [];
    if (isApex) {
      instructions.push({
        type: 'A', name: '@',
        value: 'YOUR_SERVER_IP',
        ttl: 300,
        notes: 'A record for the root domain. CNAME is not valid at the apex.',
      });
    } else {
      instructions.push({
        type: 'CNAME',
        name: domain.replace(`.${PLATFORM_DOMAIN}`, '').split('.')[0],
        value: `${slug}.apps.${PLATFORM_DOMAIN}`,
        ttl: 300,
        notes: `Routes ${domain} to your FIDScript deployment.`,
      });
    }
    instructions.push({
      type: 'TXT',
      name: `_fidscript-verification.${domain}`,
      value: 'FIDScript verified',
      ttl: 300,
      notes: 'Proves you own this domain. Required for verification.',
    });
    return instructions;
  }

  private extractSlug(deploymentUrl: string): string {
    try {
      const host = deploymentUrl.replace('https://', '').replace('http://', '').split(':')[0];
      return host.split('.')[0];
    } catch { return 'app'; }
  }

  private async checkMxRecords(domain: string): Promise<{ hasMx: boolean; provider: string }> {
    try {
      const resp = await (await import('axios')).default.get(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
        { headers: { Accept: 'application/dns-json' }, timeout: 8_000 },
      );
      if (resp.data?.Answer?.length > 0) {
        const mx = resp.data.Answer.map((a: any) => a.data).join(',');
        if (mx.includes('google.com')) return { hasMx: true, provider: 'GOOGLE_WORKSPACE' };
        if (mx.includes('outlook.com') || mx.includes('microsoft.com')) return { hasMx: true, provider: 'MICROSOFT_365' };
        if (mx.includes('zoho.com')) return { hasMx: true, provider: 'ZOHO' };
        if (mx.includes('amazonses.com')) return { hasMx: true, provider: 'SES' };
        if (mx.includes('mailgun.org')) return { hasMx: true, provider: 'MAILGUN' };
        return { hasMx: true, provider: 'CUSTOM' };
      }
    } catch { /* ignore */ }
    try {
      const { execSync } = require('child_process');
      const out = execSync(`dig +short MX ${domain} 2>/dev/null`, { timeout: 8_000 }).toString().trim();
      if (out && !out.includes('no MX')) {
        if (out.includes('google.com')) return { hasMx: true, provider: 'GOOGLE_WORKSPACE' };
        if (out.includes('outlook.com') || out.includes('microsoft.com')) return { hasMx: true, provider: 'MICROSOFT_365' };
        if (out.includes('zoho.com')) return { hasMx: true, provider: 'ZOHO' };
        return { hasMx: true, provider: 'CUSTOM' };
      }
    } catch { /* ignore */ }
    return { hasMx: false, provider: '' };
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
