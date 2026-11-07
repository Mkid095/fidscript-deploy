import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type VerificationKind = 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK';

interface VerificationEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * The emails the verification flows send, and the links they carry.
 *
 * The links point at the **dashboard**, not at the API — they are pages a
 * person opens. They used to point at `${APP_URL}/auth/reset-password`,
 * which was not a page that existed: the reset link landed on a 404, and
 * the whole recovery flow was a dead end.
 */
@Injectable()
export class AuthVerificationEmailService {
  private readonly dashboardBaseUrl: string;

  constructor(configService: ConfigService) {
    const domain = configService.get<string>('PLATFORM_DOMAIN') ?? '';
    this.dashboardBaseUrl = (
      configService.get<string>('APP_URL') ??
      configService.get<string>('DASHBOARD_PUBLIC_URL') ??
      (domain ? `https://${domain}` : 'http://localhost:3000')
    ).replace(/\/+$/, '');
  }

  /** The link a person opens for this kind of verification. */
  linkFor(kind: VerificationKind, token: string): string {
    const path =
      kind === 'EMAIL_VERIFY'
        ? '/verify-email'
        : kind === 'PASSWORD_RESET'
          ? '/reset-password'
          : '/magic-link';
    return `${this.dashboardBaseUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  /** The email itself. */
  build(kind: VerificationKind, token: string, expiry: string): VerificationEmail {
    const url = this.linkFor(kind, token);
    const title =
      kind === 'EMAIL_VERIFY'
        ? 'Confirm your email'
        : kind === 'PASSWORD_RESET'
          ? 'Reset your password'
          : 'Sign in to FIDScript';
    const cta =
      kind === 'EMAIL_VERIFY'
        ? 'Confirm email'
        : kind === 'PASSWORD_RESET'
          ? 'Reset password'
          : 'Sign in';
    const what =
      kind === 'EMAIL_VERIFY'
        ? 'confirm your email address'
        : kind === 'PASSWORD_RESET'
          ? 'reset your password'
          : 'sign in to your account';

    const textBody =
      kind === 'EMAIL_VERIFY'
        ? `Click the link to confirm your email address:\n\n${url}\n\nThis link expires in ${expiry}.`
        : kind === 'PASSWORD_RESET'
          ? `Click the link to reset your password:\n\n${url}\n\nThis link expires in ${expiry}.`
          : `Click the link to sign in:\n\n${url}\n\nThis link expires in ${expiry}.`;

    return {
      subject:
        kind === 'EMAIL_VERIFY'
          ? 'Confirm your FIDScript email'
          : kind === 'PASSWORD_RESET'
            ? 'Reset your FIDScript password'
            : 'Your FIDScript magic sign-in link',
      text: textBody,
      html: this.html({ title, cta, what, url, expiry }),
    };
  }

  private html(opts: { title: string; cta: string; what: string; url: string; expiry: string }): string {
    const { title, cta, what, url, expiry } = opts;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#080a0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0d;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f1117;border:1px solid #1e2130;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f1117;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1e2130;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.15em;color:#f97316;text-transform:uppercase;">fidscript deploy</p>
            </td>
          </tr>
          <tr>
            <td style="background:#0f1117;padding:36px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#e2e8f0;">${title}</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Click the button below to ${what}.</p>
              <a href="${url}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:20px;">${cta}</a>
              <p style="margin:0;font-size:13px;color:#475569;">Or copy and paste this link into your browser:<br/><a href="${url}" style="color:#64748b;word-break:break-all;">${url}</a></p>
              <p style="margin:20px 0 0;font-size:12px;color:#475569;">This link expires in <strong style="color:#94a3b8;">${expiry}</strong>. If you did not request this, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
