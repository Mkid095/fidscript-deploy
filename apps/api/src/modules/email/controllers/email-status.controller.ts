import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
@Controller('api/v1/projects/:projectId/email')
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
    const email = infra.email;
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
      smtpHost: email?.smtpHost ?? null,
      imapHost: email?.imapHost ?? null,
      jmapUrl: email?.jmapUrl ?? null,
    };
  }
}
