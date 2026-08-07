import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface EmailConfig {
  /** The project's primary domain. */
  domain: string;
  /** The EmailDomain row in the platform DB. May be null if the project hasn't completed email setup yet. */
  emailDomainId: string | null;
  /** DKIM selector (e.g. 'default') — null until Stalwart has generated a key. */
  dkimSelector: string | null;
  /** DKIM public key (TXT record value) — null until Stalwart has generated a key. */
  dkimPublicKey: string | null;
  /** Per-record verification status. */
  verification: {
    dkim: boolean;
    spf: boolean;
    dmarc: boolean;
    mx: boolean;
  };
  /** Overall status of the email domain (PENDING | VERIFIED | ACTIVE | FAILED). */
  status: string | null;
  /** SMTP host (where the project's outbound + inbound mail flows). */
  smtpHost: string;
  /** IMAP host. */
  imapHost: string;
  /** JMAP endpoint. */
  jmapUrl: string;
}

/**
 * EmailPrimitive — derived email configuration for a project.
 *
 * Returns everything the email service needs to operate: the
 * primary domain, the DKIM key, the verification status, and the
 * SMTP/IMAP/JMAP endpoints. Built from `EmailDomain` (the existing
 * per-project email table) and the project's primary domain.
 *
 * Future: as more services migrate to consume infrastructure, the
 * underlying `EmailDomain` row will be replaced by
 * `Domain.capabilities.email === true` plus a per-service sub-row
 * where it makes sense.
 */
@Injectable()
export class EmailPrimitive {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the project's full email configuration. Returns null if the
   * project has no primary domain yet.
   */
  async getConfig(projectId: string): Promise<EmailConfig | null> {
    const domain = await this.prisma.domain.findFirst({
      where: { projectId, isPrimary: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!domain) return null;

    const apexZone = domain.zoneDomain ?? domain.domain;
    const emailDomain = await this.prisma.emailDomain.findUnique({
      where: { projectId_domain: { projectId, domain: domain.domain } },
    });

    return {
      domain: domain.domain,
      emailDomainId: emailDomain?.id ?? null,
      dkimSelector: emailDomain?.dkimSelector ?? null,
      dkimPublicKey: emailDomain?.dkimPublicKey ?? null,
      verification: {
        dkim: emailDomain?.dkimVerified ?? false,
        spf: emailDomain?.spfVerified ?? false,
        dmarc: emailDomain?.dmarcVerified ?? false,
        mx: emailDomain?.mxVerified ?? false,
      },
      status: emailDomain?.status ?? null,
      smtpHost: `mail.${apexZone}`,
      imapHost: `imap.${apexZone}`,
      jmapUrl: `https://mail.${apexZone}/jmap/`,
    };
  }

  /**
   * Find the project's EmailDomain row by the project's primary domain.
   * Returns null if the project hasn't been set up for email yet.
   */
  async getEmailDomainForProject(projectId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { projectId, isPrimary: true },
    });
    if (!domain) return null;
    return this.prisma.emailDomain.findUnique({
      where: { projectId_domain: { projectId, domain: domain.domain } },
    });
  }
}
