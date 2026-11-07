import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { MailDnsService } from '@/modules/email/dns/mail-dns.service';
import { DomainCleanupService } from '@/modules/email/services/domain-cleanup.service';
import { CreateEmailDomainDto } from '@/modules/email/dto/create-email-domain.dto';
import * as crypto from 'crypto';

/**
 * EmailDomain lifecycle service.
 *
 * State machine (EmailDomainStatus):
 *   PENDING  → user created the domain, has not yet proved ownership
 *   VERIFIED → ownership TXT confirmed, DKIM/SPF/DMARC/MX records provisioned
 *   ACTIVE   → all DNS records confirmed, mailboxes may be created
 *   FAILED   → verification failed permanently (see Recovery below)
 *
 * Recovery paths:
 *   - PENDING → call verifyDomain (proves ownership + provisions DNS)
 *   - VERIFIED → call verifyDomain (re-checks DKIM/SPF/DMARC/MX; flips to ACTIVE)
 *   - FAILED → call retryDomain (re-mints ownership token, resets to PENDING,
 *              then proceeds via normal verifyDomain flow). Alternatively, the
 *              user can deleteDomain + createDomain to start fresh.
 *   - ACTIVE → no recovery needed; mailbox-level isActive=false suspends a single
 *              mailbox without touching the domain.
 *   - Any state → deleteDomain (DomainCleanupService tears down Stalwart + DB).
 */
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

    await this.eventService.emit('email.domain_added', projectId, {
      domainId: domain.id, domain: dto.domain,
    }, {});

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
        projectId, domain.domain, domain.ownershipToken!,
      );
      if (!ownershipVerified) {
        throw new BadRequestException(
          'Ownership not verified. Add the TXT record: ' +
          `${domain.ownershipToken}._email.${domain.domain}`,
        );
      }
      const dnsResult = await this.mailDnsService.setupEmailDns(projectId, domain.domain);
      await this.prisma.emailDomain.update({
        where: { id: domainId },
        data: { status: 'VERIFIED', ownershipToken: null, dkimPublicKey: dnsResult.dkimPublicKey },
      });
      await this.eventService.emit('email.domain_verified', projectId, {
        domainId, domain: domain.domain, step: 'ownership',
      }, {});
    }

    if (domain.status === 'VERIFIED') {
      const result = await this.mailDnsService.verifyEmailDns(projectId, domain.domain);
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

      await this.eventService.emit('email.domain_verified', projectId, {
        domainId, domain: domain.domain, ...result,
      }, {});
    }

    return this.prisma.emailDomain.findUnique({ where: { id: domainId } });
  }

  /**
   * Recovery entry point for FAILED domains.
   *
   * Re-mints a fresh ownership token, resets the domain to PENDING, clears
   * the verification flags, and emits a recovery event so the caller can
   * re-display the DNS steps. The caller then calls verifyDomain (perhaps
   * immediately after, once the new TXT record has propagated) to drive
   * the domain through PENDING → VERIFIED → ACTIVE.
   *
   * If the user prefers a clean slate, deleteDomain is the alternative
   * recovery path — it tears down Stalwart state and allows re-creation.
   */
  async retryDomain(projectId: string, domainId: string) {
    const domain = await this.prisma.emailDomain.findFirst({
      where: { id: domainId, projectId },
    });
    if (!domain) throw new NotFoundException('Domain not found');

    if (domain.status !== 'FAILED') {
      throw new BadRequestException(
        `retryDomain is only valid for FAILED domains (current: ${domain.status}). ` +
        `Use verifyDomain for PENDING/VERIFIED, or deleteDomain to start over.`,
      );
    }

    const ownershipToken = crypto.randomBytes(16).toString('hex');

    const updated = await this.prisma.emailDomain.update({
      where: { id: domainId },
      data: {
        status: 'PENDING',
        ownershipToken,
        dkimVerified: false,
        spfVerified: false,
        dmarcVerified: false,
        mxVerified: false,
        dkimSelector: null,
        dkimPublicKey: null,
        verifiedAt: null,
      },
    });

    await this.eventService.emit('email.domain_recovery_started', projectId, {
      domainId,
      domain: domain.domain,
      previousStatus: domain.status,
    }, {});

    return {
      domain: updated,
      ownershipToken,
      steps: [
        `1. Add TXT record: ${ownershipToken}._email.${domain.domain}`,
        `2. Confirm MX record: mail.${domain.domain} → 10 mail.${domain.domain}`,
        `3. Call POST .../verify — ownership will be confirmed and DNS records re-provisioned`,
      ],
      message: 'Domain reset to PENDING. Re-add the TXT record (a fresh token was issued) and call verifyDomain to retry.',
    };
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
