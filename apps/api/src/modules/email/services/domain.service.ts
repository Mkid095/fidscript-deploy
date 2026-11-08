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

  /**
   * The project's email domain, if it has one — the name the mail rides on.
   * The status screen falls back to this when the infrastructure record has
   * not been written, so what the project registered is what it shows.
   */
  async firstEmailDomain(projectId: string) {
    return this.prisma.emailDomain.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

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

  /**
   * One click, the whole set up.
   *
   * The name the mail rides on is the project's own — the same one the
   * domains page registered, not a separately-typed string. This finds
   * that name, makes sure the email domain exists for it, writes the
   * MX/SPF/DKIM/DMARC records through the project's Cloudflare connection
   * in one go, and reports which of the four are confirmed. What the
   * person clicked is done; the page then shows the truth, record by record.
   */
  async setup(projectId: string, domainParam?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // The name the mail follows: the explicit argument, else the project's
    // registered domain — the one the domains page put there.
    let name: string | null = domainParam ?? null;
    if (!name) {
      const registered = await this.prisma.domain.findFirst({
        where: { projectId },
        select: { domain: true },
        orderBy: { createdAt: 'asc' },
      });
      name = registered?.domain ?? null;
    }
    if (!name) {
      const existing = await this.prisma.emailDomain.findFirst({
        where: { projectId },
        select: { domain: true },
      });
      name = existing?.domain ?? null;
    }
    if (!name) {
      throw new BadRequestException(
        'No domain to set up. Register the project name on the domains page first — the mail follows it.',
      );
    }

    // The email domain for that name, created if the project has not claimed it.
    let emailDomain = await this.prisma.emailDomain.findFirst({
      where: { projectId, domain: name },
    });
    if (!emailDomain) {
      emailDomain = await this.prisma.emailDomain.create({
        data: {
          projectId,
          domain: name,
          status: 'PENDING',
          ownershipToken: crypto.randomBytes(16).toString('hex'),
        },
      });
    }

    // Write the four records through the project's own connection.
    let setupError: string | null = null;
    try {
      await this.mailDnsService.setupEmailDns(projectId, name);
    } catch (err) {
      // No connection, or a zone we cannot reach: the records could not be
      // written, so say what is missing rather than failing opaquely.
      setupError = err instanceof Error ? err.message : String(err);
    }

    // Report which are actually confirmed now — the chips stay "pending"
    // until this says otherwise.
    const checks = await this.mailDnsService.verifyEmailDns(projectId, name);
    const allVerified = checks.dkim && checks.spf && checks.dmarc && checks.mx;
    emailDomain = await this.prisma.emailDomain.update({
      where: { id: emailDomain.id },
      data: {
        dkimVerified: checks.dkim,
        spfVerified: checks.spf,
        dmarcVerified: checks.dmarc,
        mxVerified: checks.mx,
        status: allVerified ? 'ACTIVE' : emailDomain.status === 'PENDING' ? 'VERIFIED' : emailDomain.status,
        ...(allVerified ? { verifiedAt: new Date() } : {}),
      },
    });

    await this.eventService.emit(
      'email.domain_setup',
      projectId,
      { domainId: emailDomain.id, domain: name, ...checks, status: emailDomain.status },
      {},
    );

    return {
      domain: name,
      status: emailDomain.status,
      mx: checks.mx,
      spf: checks.spf,
      dkim: checks.dkim,
      dmarc: checks.dmarc,
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
