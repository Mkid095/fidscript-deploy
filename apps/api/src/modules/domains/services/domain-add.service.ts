import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainMxService } from '@/modules/domains/services/domain-mx.service';
import { DomainCloudflareAutoService } from '@/modules/domains/services/domain-cloudflare-auto.service';
import { DomainListService } from './domain-list.service';
import { DomainAccessService } from './domain-access.service';
import { AddDomainDto } from '@/modules/domains/dto/add-domain.dto';

@Injectable()
export class DomainAddService {
  private readonly platformDomain: string;

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private domainMxService: DomainMxService,
    private cloudflareAuto: DomainCloudflareAutoService,
    private listService: DomainListService,
    private access: DomainAccessService,
    private configService: ConfigService,
  ) {
    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'apps.local');
  }

  async add(userId: string, projectId: string, dto: AddDomainDto) {
    await this.access.ensureAccess(userId, projectId);

    const deployment = await this.prisma.deployment.findUnique({ where: { id: dto.deploymentId } });
    if (!deployment || deployment.projectId !== projectId) throw new NotFoundException('Deployment not found in this project');
    if (deployment.status !== 'SUCCESS') throw new ConflictException('Can only add a domain to a successful deployment');
    const existing = await this.prisma.domain.findFirst({ where: { projectId, domain: dto.domain } });
    if (existing) throw new ConflictException('Domain already added to this project');

    const isPlatform = dto.domain.endsWith(`.${this.platformDomain}`);
    const isApex = !dto.domain.startsWith('www.') && dto.domain.split('.').length === 2;
    const mx = await this.domainMxService.checkMxRecords(dto.domain);
    const isPrimary = (await this.prisma.domain.count({ where: { projectId } })) === 0;

    const domain = await this.prisma.domain.create({
      data: {
        projectId, deploymentId: dto.deploymentId, domain: dto.domain,
        isCustom: !isPlatform, isPrimary, apexDomain: isApex,
        dnsMode: dto.dnsMode ?? 'manual', redirectMode: dto.redirectMode ?? 'none',
        sslEnabled: dto.sslEnabled ?? true, sslStatus: 'PENDING', dnsStatus: 'PENDING',
        emailWarning: mx.hasMx, emailProvider: mx.provider || null,
      },
    });

    await this.eventService.emit('domain.added' as any, {
      id: `${domain.id}-${Date.now()}`, type: 'domain.added', timestamp: new Date(),
      actorId: userId, actorType: 'user', resourceType: 'domain', resourceId: domain.id,
      metadata: { domainId: domain.id, projectId, domain: dto.domain, isCustom: !isPlatform, emailWarning: mx.hasMx, emailProvider: mx.provider },
    });

    const instructions = this.getDnsInstructions(dto.domain, deployment.deploymentUrl ?? '', isApex);
    if (dto.dnsMode === 'cloudflare_auto') {
      await this.cloudflareAuto.cloudflareAutoSetup(domain.id, dto.domain, deployment.deploymentUrl ?? '', isApex);
    }

    return {
      domain: this.listService.formatDomain(domain),
      instructions,
      emailWarning: mx.hasMx ? { detected: true, provider: mx.provider, message: `Email service detected (${mx.provider}).` } : { detected: false },
    };
  }

  async getInstructions(userId: string, projectId: string, domainId: string) {
    await this.access.ensureAccess(userId, projectId);
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    return { domain: this.listService.formatDomain(domain), instructions: this.getDnsInstructions(domain.domain, domain.deployment?.deploymentUrl ?? '', domain.apexDomain) };
  }

  getDnsInstructions(domain: string, deploymentUrl: string | null, isApex: boolean) {
    const slug = this.extractSlug(deploymentUrl || domain);
    const instructions = [];
    if (isApex) {
      instructions.push({ type: 'A', name: '@', value: 'YOUR_SERVER_IP', ttl: 300, notes: 'A record for the root domain.' });
    } else {
      instructions.push({ type: 'CNAME', name: domain.replace(`.${this.platformDomain}`, '').split('.')[0], value: `${slug}.apps.${this.platformDomain}`, ttl: 300, notes: `Routes ${domain} to your deployment.` });
    }
    instructions.push({ type: 'TXT', name: `_fidscript-verification.${domain}`, value: 'FIDScript verified', ttl: 300, notes: 'Proves you own this domain.' });
    return instructions;
  }

  private extractSlug(deploymentUrl: string): string {
    try { return deploymentUrl.replace('https://', '').replace('http://', '').split(':')[0].split('.')[0]; }
    catch { return 'app'; }
  }
}
