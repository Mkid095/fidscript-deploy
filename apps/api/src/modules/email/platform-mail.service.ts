import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

/**
 * Platform-originated email — for system messages with NO project context:
 * magic-code login, password-reset, security notifications.
 *
 * Distinct from `SmtpSendService` (which is project-scoped: it looks up the
 * project, enforces sender-identity + suppression + API-key usage, and records
 * an `EmailMessage` row). System mail has none of those — it sends from
 * `SMTP_FROM` over the same Stalwart submission transport and returns.
 *
 * The transporter config mirrors `SmtpSendService` (Stalwart v0.15.5: port 465
 * implicit TLS, AUTH PLAIN `admin` + STALWART_ADMIN_TOKEN, self-signed cert on
 * the internal hop). (Minor debt: DRY the transporter builder — see
 * docs/technical-debt.md if it grows.)
 */
@Injectable()
export class PlatformMailService {
  private readonly logger = new Logger(PlatformMailService.name);
  private readonly adminToken: string;

  constructor(private config: ConfigService) {
    const tokenFile = this.config.get<string>(
      'STALWART_ADMIN_TOKEN_FILE',
      '/run/secrets/stalwart_admin_token',
    );
    try {
      this.adminToken = fs.readFileSync(tokenFile, 'utf8').trim();
    } catch {
      this.adminToken = this.config.get<string>('STALWART_ADMIN_TOKEN', '');
    }
  }

  /**
   * SMTP connectivity check — verifies the Stalwart submission endpoint is reachable.
   * Used by the onboarding health board. Does NOT send a message.
   */
  async check(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string }> {
    const smtpHost = this.config.get<string>('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const smtpPort = this.config.get<number>('STALWART_SMTP_PORT', 465);
    const start = Date.now();

    try {
      const { default: nodemailer } = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: 'admin', pass: this.adminToken },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
      });

      // Verify the connection without sending a message.
      await transporter.verify();
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { status: 'down', latencyMs: Date.now() - start, error };
    }
  }

  async send(dto: { to: string; subject: string; text?: string; html?: string }): Promise<{ status: 'sent' | 'failed'; error?: string }> {
    const smtpHost = this.config.get<string>('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const smtpPort = this.config.get<number>('STALWART_SMTP_PORT', 465);
    const from = this.config.get<string>('SMTP_FROM', 'noreply@localhost');

    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: 'admin', pass: this.adminToken },
      tls: { rejectUnauthorized: false },
    });

    try {
      await transporter.sendMail({
        from,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      });
      return { status: 'sent' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn(`platform mail to ${dto.to} failed: ${error}`);
      return { status: 'failed', error };
    }
  }
}
