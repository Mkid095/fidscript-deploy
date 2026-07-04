import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;
const MAGIC_LINK_TTL_MINUTES = 15;

interface SendVerificationOptions {
  email: string;
  type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Phase 5.1 — Verification token lifecycle.
 *
 * Handles:
 *  - Email verification (new registration confirm)
 *  - Password reset request + confirm
 *  - Magic link request + confirm
 *
 * Tokens are cryptographically random, stored in plain in VerificationToken.token
 * (not hashed) so they can be looked up from the URL parameter. The URL itself
 * should be sent over TLS only.
 */
@Injectable()
export class AuthVerificationService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private mail: PlatformMailService,
    private session: AuthSessionService,
  ) {}

  // ─── Send verification / reset / magic link ────────────────────────────────

  async sendVerification(dto: { email: string; type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK' }, ipAddress?: string, userAgent?: string) {
    const { email, type } = dto;
    const normalized = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    // EMAIL_VERIFY: user must exist and not yet verified
    if (type === 'EMAIL_VERIFY') {
      if (!user) throw new NotFoundException('No account found with this email address');
      // Allow re-send even if already verified (user might not have received the first email)
    }

    // PASSWORD_RESET: user must exist
    if (type === 'PASSWORD_RESET') {
      if (!user) throw new NotFoundException('No account found with this email address');
    }

    // MAGIC_LINK: user may or may not exist — always say "sent" to avoid account enumeration
    const ttlHours = type === 'EMAIL_VERIFY' ? EMAIL_VERIFY_TTL_HOURS
      : type === 'PASSWORD_RESET' ? PASSWORD_RESET_TTL_HOURS
      : MAGIC_LINK_TTL_MINUTES / 60;

    // Invalidate any existing unconsumed tokens of the same type for this user
    if (user) {
      await this.prisma.verificationToken.updateMany({
        where: { userId: user.id, type, consumed: false },
        data: { consumed: true },
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    if (user) {
      await this.prisma.verificationToken.create({
        data: { userId: user.id, token, type, expiresAt },
      });
    }

    const baseUrl = process.env['APP_URL'] ?? 'https://app.fidscript.com';
    const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
    const linkUrl = `${baseUrl}/auth/magic-link/verify?token=${token}`;

    const url = type === 'EMAIL_VERIFY' ? verifyUrl
      : type === 'PASSWORD_RESET' ? resetUrl
      : linkUrl;

    const subject = type === 'EMAIL_VERIFY' ? 'Confirm your FIDScript email'
      : type === 'PASSWORD_RESET' ? 'Reset your FIDScript password'
      : 'Your FIDScript magic sign-in link';

    const textBody = type === 'EMAIL_VERIFY'
      ? `Click the link to confirm your email address:\n\n${verifyUrl}\n\nThis link expires in ${EMAIL_VERIFY_TTL_HOURS} hours.`
      : type === 'PASSWORD_RESET'
      ? `Click the link to reset your password:\n\n${resetUrl}\n\nThis link expires in ${PASSWORD_RESET_TTL_HOURS} hour.`
      : `Click the link to sign in:\n\n${linkUrl}\n\nThis link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.`;

    const htmlBody = this.buildHtmlEmail({ type, url, email: normalized });

    if (user) {
      await this.mail.send({ to: normalized, subject, text: textBody, html: htmlBody });
    }

    // Emit event (no userId for magic link when user doesn't exist)
    const eventType = type === 'EMAIL_VERIFY' ? 'identity.user.email_verification_sent'
      : type === 'PASSWORD_RESET' ? 'identity.user.password_reset_requested'
      : 'identity.user.magic_link_sent';

    await this.eventService.emit(eventType, null, { email: normalized }, {
      actorId: user?.id ?? undefined,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user?.id ?? undefined,
      ipAddress,
      userAgent,
    });

    return { sent: true };
  }

  // ─── Verify email ────────────────────────────────────────────────────────────

  async verifyEmail(dto: { token: string }, ipAddress?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!record) throw new UnauthorizedException('Invalid or expired token');
    if (record.consumed) throw new BadRequestException('Token already used');
    if (record.type !== 'EMAIL_VERIFY') throw new BadRequestException('Token is not an email verification token');
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Token has expired');

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

    // Mark verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    await this.eventService.emit('identity.user.email_verified', null, { email: user.email }, {
      actorId: user.id,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    return { verified: true, email: user.email };
  }

  // ─── Confirm password reset ─────────────────────────────────────────────────

  async confirmPasswordReset(dto: { token: string; newPassword: string }, ipAddress?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!record) throw new UnauthorizedException('Invalid or expired token');
    if (record.consumed) throw new BadRequestException('Token already used');
    if (record.type !== 'PASSWORD_RESET') throw new BadRequestException('Token is not a password reset token');
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Token has expired');

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

    // Use AuthPasswordService pattern — bcrypt via UserCredential
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.userCredential.upsert({
      where: { userId_type: { userId: user.id, type: 'PASSWORD' } },
      create: { userId: user.id, type: 'PASSWORD', secretHash: passwordHash },
      update: { secretHash: passwordHash },
    });

    // Clear mustChangePassword if set
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    // Revoke all existing sessions (force re-login with new password)
    // Session uses expiresAt for revocation: new Date(0) = revoked, gt new Date(0) = active
    await this.prisma.session.updateMany({
      where: { userId: user.id, expiresAt: { gt: new Date(0) } },
      data: { expiresAt: new Date(0) },
    });

    await this.eventService.emit('identity.user.password_reset_completed', null, {}, {
      actorId: user.id,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  // ─── Confirm magic link ──────────────────────────────────────────────────────

  async confirmMagicLink(dto: { token: string }, ipAddress?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!record) throw new UnauthorizedException('Invalid or expired link');
    if (record.consumed) throw new BadRequestException('Link already used');
    if (record.type !== 'MAGIC_LINK') throw new BadRequestException('Token is not a magic link');
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Link has expired');

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.eventService.emit('identity.user.magic_link_verified', null, { email: user.email }, {
      actorId: user.id,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    const sess = await this.session.createSession(user.id, ipAddress, userAgent);
    return this.session.buildAuthResponse(user, sess);
  }

  // ─── HTML email builder ──────────────────────────────────────────────────────

  private buildHtmlEmail(opts: { type: string; url: string; email: string }): string {
    const { type, url, email } = opts;
    const title = type === 'EMAIL_VERIFY' ? 'Confirm your email'
      : type === 'PASSWORD_RESET' ? 'Reset your password'
      : 'Sign in to FIDScript';

    const cta = type === 'EMAIL_VERIFY' ? 'Confirm email'
      : type === 'PASSWORD_RESET' ? 'Reset password'
      : 'Sign in';

    const expiry = type === 'EMAIL_VERIFY' ? `${EMAIL_VERIFY_TTL_HOURS} hours`
      : type === 'PASSWORD_RESET' ? `${PASSWORD_RESET_TTL_HOURS} hour`
      : `${MAGIC_LINK_TTL_MINUTES} minutes`;

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
              <img src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png" alt="FIDScript" width="56" height="56" style="display:block;margin:0 auto 8px;border-radius:8px;" />
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.15em;color:#f97316;text-transform:uppercase;">fidscript deploy</p>
            </td>
          </tr>
          <tr>
            <td style="background:#0f1117;padding:36px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#e2e8f0;">${title}</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Click the button below to ${type === 'EMAIL_VERIFY' ? 'confirm your email address' : type === 'PASSWORD_RESET' ? 'reset your password' : 'sign in to your account'}.</p>
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
