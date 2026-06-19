import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { MailDnsService } from '@/modules/email/dns/mail-dns.service';
import { DomainCleanupService } from '@/modules/email/services/domain-cleanup.service';
import { CreateEmailDomainDto } from '@/modules/email/dto/create-email-domain.dto';
import * as crypto from 'crypto';

@Injectable()
export class EmailDomainService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private mailDnsService: MailDnsService,
    private cleanup: DomainCleanupService,
  ) {}

  async createDomain(projectId: string, dto: CreateEmailDomainDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const existing = await this.prisma.emailDomain.findFirst({
      where: { projectId, domain: dto.domain },
    });
    if (existing) throw new BadRequestException('Domain already registered');

    const ownershipToken = crypto.randomBytes(16).toString('hex');

    const domain = await this.prisma.emailDomain.create({
      data: { projectId, domain: dto.domain, status: 'PENDING', ownershipToken },
    });

    await this.eventService.emit('email.domain_added', {
      domainId: domain.id, projectId, domain: dto.domain,
    });

    return {
      domain,
      ownershipToken,
      steps: [
        `1. Add TXT record: ${ownershipToken}._email.${dto.domain}`,
        `2. Add MX record: mail.${dto.domain} → 10 mail.${dto.domain}`,
        `3. Then call POST .../verify — ownership will be confirmed and DNS records created`,
      ],
    };
  }

  async verifyDomain(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (domain.status === 'PENDING') {
      const ownershipVerified = await this.mailDnsService.verifyOwnership(
        domain.domain, domain.ownershipToken!,
      );
      if (!ownershipVerified) {
        throw new BadRequestException(
          'Ownership not verified. Add the TXT record: ' +
          `${domain.ownershipToken}._email.${domain.domain}`,
        );
      }
      await this.mailDnsService.setupEmailDns(domain.domain);
      await this.prisma.emailDomain.update({
        where: { id: domainId },
        data: { status: 'VERIFIED', ownershipToken: null },
      });
      await this.eventService.emit('email.domain_verified', {
        domainId, projectId, domain: domain.domain, step: 'ownership',
      });
    }

    if (domain.status === 'VERIFIED') {
      const result = await this.mailDnsService.verifyEmailDns(domain.domain);
      const allVerified = result.dkim && result.spf && result.dmarc && result.mx;

      await this.prisma.emailDomain.update({
        where: { id: domainId },
        data: {
          dkimVerified: result.dkim,
          spfVerified: result.spf,
          dmarcVerified: result.dmarc,
          mxVerified: result.mx,
          dkimSelector: result.dkim ? 'default' : null,
          ...(allVerified ? { status: 'ACTIVE', verifiedAt: new Date() } : {}),
        },
      });

      await this.eventService.emit('email.domain_verified', {
        domainId, projectId, domain: domain.domain, ...result,
      });
    }

    return this.prisma.emailDomain.findUnique({ where: { id: domainId } });
  }

  listDomains(projectId: string) {
    return this.prisma.emailDomain.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  }

  getDomain(projectId: string, domainId: string) {
    return this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
    }).then(d => { if (!d) throw new NotFoundException('Domain not found'); return d; });
  }

  deleteDomain(projectId: string, domainId: string) {
    return this.cleanup.deleteDomain(projectId, domainId);
  }
}
