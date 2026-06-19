import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { StalwartAccountService } from '@/modules/email/stalwart/stalwart-account.service';

/**
 * Ensures the platform's own mail domain is ready on every healthy boot:
 *
 *   1. A "domain" principal for PLATFORM_DOMAIN exists → Stalwart treats the
 *      domain as LOCAL (accepts + delivers mail for it). Without this, mail
 *      to @<platform-domain> is queued as "remote" and never delivered.
 *   2. System mailboxes exist: alert@ (monitoring notifications) and
 *      noreply@ (the default SMTP_FROM). Outbound uses admin-token auth, so
 *      the mailbox password is only for optional IMAP login — it is read
 *      from SYSTEM_MAILBOX_PASSWORD, or generated + logged once if unset.
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
    private readonly accounts: StalwartAccountService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    try {
      await this.accounts.ensureDomainPrincipal(domain);
      const password = this.resolvePassword();
      await this.accounts.ensureAccount(`alert@${domain}`, password, 'System Alerts');
      await this.accounts.ensureAccount(`noreply@${domain}`, password, 'No Reply');
      this.logger.log(`Email bootstrap complete for ${domain} (alert@, noreply@ ready)`);
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
