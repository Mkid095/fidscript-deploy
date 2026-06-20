import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
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
const SEND_IP_LIMIT = 10;
const SEND_EMAIL_LIMIT = 3;
const SEND_WINDOW_SEC = 15 * 60;

/**
 * Platform magic-code login (PREREQ-AUTH-3). A 6-digit OTP, bcrypt-hashed +
 * 10-minute expiry + attempt-limited, delivered via PlatformMailService (Stalwart).
 * Replaces the broken magic-link path (AUTH-05/06, which queried
 * `where user.email === token`).
 */
@Injectable()
export class AuthMagicCodeService {
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
    const codeHash = await bcrypt.hash(code, 10); // 6-digit codes are low-entropy; hash for defense-in-depth
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.prisma.magicCode.create({ data: { email, codeHash, expiresAt } });

    const result = await this.mail.send({
      to: email,
      subject: 'Your FIDScript login code',
      text: `Your login code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
      html: `<p>Your login code is <strong style="font-size:1.4em;letter-spacing:0.2em">${code}</strong>.</p><p>It expires in ${CODE_TTL_MINUTES} minutes. If you did not request this, ignore this email.</p>`,
    });

    await this.eventService.emit(
      'identity.user.magic_code_sent',
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
      'identity.user.magic_code_verified',
      {},
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return this.session.buildAuthResponse(user, sess);
  }

  private generateCode(): string {
    // Uniform 6-digit code (0-padded). crypto.randomInt avoids modulo bias.
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }
}
