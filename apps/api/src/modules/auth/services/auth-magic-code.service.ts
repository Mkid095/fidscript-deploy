import { Injectable, UnauthorizedException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { AuthSessionService, AuthResponse } from '@/modules/auth/services/auth-session.service';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
// Rate limiting (mirrors login): per-IP cap + per-email send cap within a window.
const SEND_IP_LIMIT = 30;
const SEND_EMAIL_LIMIT = 10;
const SEND_WINDOW_SEC = 15 * 60;

/**
 * Platform magic-code login (PREREQ-AUTH-3). A 6-digit OTP, bcrypt-hashed +
 * 10-minute expiry + attempt-limited, delivered via PlatformMailService (Stalwart).
 * Replaces the broken magic-link path (AUTH-05/06, which queried
 * `where user.email === token`).
 */
@Injectable()
export class AuthMagicCodeService {
  private readonly logger = new Logger(AuthMagicCodeService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private rateLimiter: AuthRateLimiter,
    private session: AuthSessionService,
    private mail: PlatformMailService,
  ) {}

  async requestCode(dto: { email: string }, ipAddress?: string, userAgent?: string): Promise<{ sent: boolean }> {
    const email = dto.email.toLowerCase();

    if (ipAddress) {
      const ipRl = await this.rateLimiter.consume(`rl:magic:ip:${ipAddress}`, SEND_IP_LIMIT, SEND_WINDOW_SEC);
      if (!ipRl.allowed) {
        throw new HttpException('Too many code requests from this address. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const emailRl = await this.rateLimiter.consume(`rl:magic:email:${email}`, SEND_EMAIL_LIMIT, SEND_WINDOW_SEC);
    if (!emailRl.allowed) {
      throw new HttpException('Too many codes requested for this email. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return { sent: true } — never reveal whether the email exists.
    if (!user) return { sent: true };

    const code = this.generateCode();
    this.logger.log(`MAGIC_CODE ${email}: ${code}`);
    const codeHash = await bcrypt.hash(code, 10); // 6-digit codes are low-entropy; hash for defense-in-depth
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.prisma.magicCode.create({ data: { email, codeHash, expiresAt } });

    const result = await this.mail.send({
      to: email,
      subject: 'Your FIDScript login code',
      text: `Your login code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FIDScript Login Code</title>
</head>
<body style="margin:0;padding:0;background:#080a0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0d;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f1117;border:1px solid #1e2130;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0f1117;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1e2130;">
              <img
                src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
                alt="FIDScript"
                width="56"
                height="56"
                style="display:block;margin:0 auto 8px;border-radius:8px;"
              />
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.15em;color:#f97316;text-transform:uppercase;">fidscript deploy</p>
              <p style="margin:4px 0 0;font-size:10px;color:#64748b;letter-spacing:0.1em;">by NextMavens</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#0f1117;padding:36px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#e2e8f0;">Your security code</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;">Use the code below to sign in to your dashboard.</p>
              <div style="background:#1e2130;border:1px solid #2a2d3a;border-radius:10px;padding:20px 32px;display:inline-block;">
                <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#f97316;font-family:'SF Mono','Fira Code',monospace;">${code}</p>
              </div>
              <p style="margin:24px 0 0;font-size:13px;color:#64748b;">
                This code expires in <strong style="color:#94a3b8;">${CODE_TTL_MINUTES} minutes</strong>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#080a0d;padding:20px 40px;border-top:1px solid #1e2130;">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
                If you did not request this code, you can safely ignore this email.<br/>
                Security code requests are only valid for a single sign-in.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    await this.eventService.emit(
      'identity.user.magic_code_sent', null,
      { delivered: result.status === 'sent' },
      { actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return { sent: true };
  }

  async verifyCode(dto: { email: string; code: string }, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();

    // Latest unconsumed, unexpired code for this email.
    const codes = await this.prisma.magicCode.findMany({
      where: { email, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const record = codes[0];
    if (!record) throw new UnauthorizedException('No valid code. Request a new one.');

    const attempts = record.attempts + 1;
    if (attempts > MAX_ATTEMPTS) {
      await this.prisma.magicCode.update({ where: { id: record.id }, data: { attempts, consumed: true } });
      throw new UnauthorizedException('Too many attempts. Request a new code.');
    }

    const match = await bcrypt.compare(dto.code, record.codeHash);
    if (!match) {
      await this.prisma.magicCode.update({ where: { id: record.id }, data: { attempts } });
      throw new UnauthorizedException('Invalid code.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    // Consume the code + null out earlier unconsumed codes for this email.
    await this.prisma.magicCode.update({ where: { id: record.id }, data: { consumed: true, attempts } });
    await this.prisma.magicCode.updateMany({
      where: { email, consumed: false, id: { not: record.id } },
      data: { consumed: true },
    });

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const sess = await this.session.createSession(user.id, ipAddress, userAgent);

    await this.eventService.emit(
      'identity.user.magic_code_verified', null, {},
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return this.session.buildAuthResponse(user, sess);
  }

  private generateCode(): string {
    // Uniform 6-digit code (0-padded). crypto.randomInt avoids modulo bias.
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }
}
