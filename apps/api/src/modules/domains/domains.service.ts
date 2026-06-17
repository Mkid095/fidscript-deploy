import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { AuditService } from '../audit/audit.service';
import { AddDomainDto } from './dto/index';

@Injectable()
export class DomainsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private auditService: AuditService,
  ) {}

  async list(userId: string, projectId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domains = await this.prisma.domain.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return { domains: domains.map(d => this.formatDomain(d)) };
  }

  async add(userId: string, projectId: string, dto: AddDomainDto) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const existing = await this.prisma.domain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (existing) {
      throw new ConflictException('Domain already added to this project');
    }

    const isCustom = dto.domain !== `${projectId}.${this.configService.get('PLATFORM_DOMAIN', 'deploy.fidscript.com')}`;

    const domain = await this.prisma.domain.create({
      data: {
        projectId,
        domain: dto.domain,
        isCustom,
        sslEnabled: dto.sslEnabled ?? true,
        dnsStatus: 'PENDING',
      },
    });

    await this.eventService.emit('domain.added', {
      domainId: domain.id,
      projectId,
      domain: dto.domain,
      isCustom,
    });

    await this.auditService.log({
      userId,
      action: 'domain.added',
      resourceType: 'domain',
      resourceId: domain.id,
      metadata: { domain: dto.domain, isCustom },
    });

    return {
      domain: this.formatDomain(domain),
      dnsConfig: this.getDnsConfig(dto.domain, projectId),
    };
  }

  async delete(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });

    if (!domain) throw new NotFoundException('Domain not found');

    await this.prisma.domain.delete({ where: { id: domainId } });

    await this.eventService.emit('domain.deleted', {
      domainId,
      projectId,
      domain: domain.domain,
    });

    await this.auditService.log({
      userId,
      action: 'domain.deleted',
      resourceType: 'domain',
      resourceId: domainId,
    });

    return { success: true };
  }

  async verify(userId: string, projectId: string, domainId: string) {
    const hasAccess = await this.checkAccess(userId, projectId);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, projectId },
    });

    if (!domain) throw new NotFoundException('Domain not found');

    const dnsValid = await this.checkDns(domain.domain);

    if (dnsValid) {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'VALID', dnsVerifiedAt: new Date() },
      });

      await this.eventService.emit('domain.verified', {
        domainId,
        projectId,
        domain: domain.domain,
      });
    } else {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { dnsStatus: 'FAILED' },
      });

      await this.eventService.emit('domain.failed', {
        domainId,
        projectId,
        domain: domain.domain,
      });
    }

    const updated = await this.prisma.domain.findUnique({ where: { id: domainId } });
    return this.formatDomain(updated!);
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

  private getDnsConfig(domain: string, projectId: string) {
    const platformDomain = this.configService.get('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const isSubdomain = domain.endsWith(`.${platformDomain}`);

    if (isSubdomain) {
      return {
        type: 'CNAME',
        name: domain.replace(`.${platformDomain}`, ''),
        value: `${projectId}.${platformDomain}`,
      };
    }

    return {
      type: 'A',
      name: '@',
      value: this.configService.get('SERVER_IP', 'YOUR_SERVER_IP'),
    };
  }

  private async checkDns(domain: string): Promise<boolean> {
    return true;
  }

  private formatDomain(domain: any) {
    return {
      id: domain.id,
      projectId: domain.projectId,
      domain: domain.domain,
      isCustom: domain.isCustom,
      sslEnabled: domain.sslEnabled,
      sslCertArn: domain.sslCertArn,
      dnsStatus: domain.dnsStatus.toLowerCase(),
      dnsVerifiedAt: domain.dnsVerifiedAt,
      createdAt: domain.createdAt,
    };
  }
}
