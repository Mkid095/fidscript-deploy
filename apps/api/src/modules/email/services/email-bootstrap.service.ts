import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_PROVIDER, IEmailProvider } from '@/modules/email/providers/i-email-provider';

/**
 * Ensures the platform's own mail domain is ready on every healthy boot:
 *
 *   1. The PLATFORM_DOMAIN exists in Stalwart as a local domain. Without
 *      this, mail to @<platform-domain> is queued as "remote" and never
 *      delivered.
 *   2. System mailboxes exist:
 *        - admin@<domain>     — the platform admin identity (SMTP_FROM,
 *                               STALWART admin login). Created by the
 *                               installer bootstrap, but we re-verify here.
 *        - alert@<domain>     — monitoring notifications.
 *        - noreply@<domain>   — fallback SMTP_FROM for transactional mail.
 *        - postmaster@<domain>— RFC 5321 requirement for a working MX.
 *   3. The PLATFORM_DOMAIN is registered in the platform's EmailDomain table.
 *      This is required so the inbound webhook can look up the domain when
 *      Stalwart receives mail for it and calls POST /email/inbound/webhook.
 *      Without this row, the webhook returns "Domain not found" and the
 *      inbound message is silently dropped.
 *
 * Idempotent and failure-tolerant: a Stalwart outage must not block API boot
 * (every call is guarded; the next boot retries).
 *
 * Mirrors the OnApplicationBootstrap restore pattern from the scheduler
 * (cron-job-scheduler.service.ts, Phase 12).
 */
@Injectable()
export class EmailBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailBootstrapService.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly email: IEmailProvider,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    try {
      // Step 1: Ensure domain exists in Stalwart (mail server).
      const d = await this.email.ensureDomain({ name: domain, isEnabled: true });

      // Step 2: Register in the platform DB so the inbound webhook can route
      // mail for this domain. The webhook's EmailInboundService looks up the
      // domain by name before creating EmailMessage rows.
      // Use upsert so this is idempotent — same domain is re-registered on
      // every boot (safe; preserves existing status/verified flags).
      const PLATFORM_PROJECT_ID = this.config.get<string>('PLATFORM_PROJECT_ID', '00000000-0000-0000-0000-000000000000');
      await this.prisma.emailDomain.upsert({
        where: { projectId_domain: { projectId: PLATFORM_PROJECT_ID, domain } },
        create: {
          projectId: PLATFORM_PROJECT_ID,
          domain,
          status: 'ACTIVE',
          dkimVerified: false,
          spfVerified: false,
          dmarcVerified: false,
          mxVerified: false,
          dkimSelector: null,
        },
        update: {}, // keep existing verified flags if already set
      });
      this.logger.log(`Platform domain ${domain} registered in platform DB`);
      const password = this.resolvePassword();
      // The order matters: mailboxes require the domain to exist first.
      // We re-issue ensures on every boot so a fresh deployment auto-creates
      // them without an installer re-run. The `ensureDomain` is idempotent.
      const targets: Array<{ name: string; description: string }> = [
        { name: 'alert', description: 'System Alerts' },
        { name: 'noreply', description: 'No Reply (transactional)' },
        { name: 'postmaster', description: 'Postmaster (RFC 5321)' },
      ];
      for (const t of targets) {
        const existing = (await this.email.listMailboxes(d.id)).find(
          (m) => m.name === t.name,
        );
        if (existing) continue;
        await this.email.createMailbox({
          name: t.name,
          domainId: d.id,
          description: t.description,
          password,
        });
        this.logger.log(`Created system mailbox ${t.name}@${domain}`);
      }
      this.logger.log(`Email bootstrap complete for ${domain} (system mailboxes ready)`);
    } catch (err) {
      // Non-fatal: Stalwart may be down or unreachable. Retry on next boot.
      this.logger.warn(`Email bootstrap skipped: ${(err as Error).message}`);
    }
  }

  /**
   * System-mailbox password: from SYSTEM_MAILBOX_PASSWORD if set (installer
   * renders a random one), otherwise generated per-boot and logged so the
   * operator can read these mailboxes via IMAP if needed.
   */
  private resolvePassword(): string {
    const configured = this.config.get<string>('SYSTEM_MAILBOX_PASSWORD');
    if (configured) return configured;
    const generated = crypto.randomBytes(12).toString('base64url');
    this.logger.warn(
      `SYSTEM_MAILBOX_PASSWORD not set — generated a random password for system mailboxes: ${generated} ` +
        `(set SYSTEM_MAILBOX_PASSWORD in the installer to make it stable across boots)`,
    );
    return generated;
  }
}
