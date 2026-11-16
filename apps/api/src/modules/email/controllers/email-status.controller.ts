import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { InfrastructureService } from '@/modules/infrastructure/infrastructure.service';
import { MailDnsService } from '@/modules/email/dns/mail-dns.service';
import { EmailDomainService } from '@/modules/email/services/domain.service';

/**
 * EmailStatusController — the single source of truth for the
 * dashboard's Email tab.
 *
 * `GET /api/v1/projects/:projectId/email/status` returns everything
 * the F06 dashboard needs to render the "✓ Configured / ✓ Verified"
 * tiles. Sourced entirely from the Infrastructure layer + the
 * email services — no direct Prisma calls.
 *
 * Auth: ApiKeyOrJwtGuard (JWT or fpk_ key) + ProjectMemberGuard.
 */
@Controller('projects/:projectId/email')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
export class EmailStatusController {
  constructor(
    private infra: InfrastructureService,
    private mailDns: MailDnsService,
    private emailDomain: EmailDomainService,
  ) {}

  @Get('status')
  async status(@Param('projectId') projectId: string) {
    const infra = await this.infra.getProjectInfrastructure(projectId);
    // The mail follows the project's own name: the infrastructure record, or
    // the email domain the project registered (what one-click "Set up" made).
    const infraEmail = infra.email;
    const registered = infraEmail ? null : await this.emailDomain.firstEmailDomain(projectId);
    const email:
      | { domain: string; status: string | null; dkimSelector?: string | null; dkimPublicKey?: string | null }
      | null =
      infraEmail ??
      (registered
        ? {
            domain: registered.domain,
            status: registered.status,
            dkimSelector: registered.dkimSelector,
            dkimPublicKey: registered.dkimPublicKey,
          }
        : null);

    const liveChecks = email
      ? await this.mailDns.verifyEmailDns(projectId, email.domain)
      : { dkim: false, spf: false, dmarc: false, mx: false };

    return {
      projectId,
      domain: email?.domain ?? null,
      dkim: {
        selector: email?.dkimSelector ?? null,
        publicKey: email?.dkimPublicKey ?? null,
        verified: liveChecks.dkim,
      },
      spf: { verified: liveChecks.spf },
      dmarc: { verified: liveChecks.dmarc },
      mx: { verified: liveChecks.mx, host: email ? `mail.${email.domain}` : null },
      cloudflare: {
        connected: infra.cloudflare.connected,
        zoneId: infra.cloudflare.zoneId,
      },
      status: email?.status ?? 'NOT_CONFIGURED',
      smtpHost: (email as { smtpHost?: string } | null)?.smtpHost ?? null,
      imapHost: (email as { imapHost?: string } | null)?.imapHost ?? null,
      jmapUrl: (email as { jmapUrl?: string } | null)?.jmapUrl ?? null,
    };
  }

  /**
   * One click: write the project's mail records (MX/SPF/DKIM/DMARC) for the
   * name the project already registered, and report which are confirmed.
   * The optional body's `domain` overrides the registered name.
   */
  @Post('setup')
  async setup(
    @Param('projectId') projectId: string,
    @Body() body: { domain?: string } | undefined,
  ) {
    return this.emailDomain.setup(projectId, body?.domain);
  }
}
