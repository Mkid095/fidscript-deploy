import { Injectable, UnauthorizedException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { SmtpSendService } from '@/modules/email/smtp/smtp-send.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_SEC = 10 * 60; // code validity
const OTP_SEND_LIMIT = 3; // max codes requested per email per window
const OTP_VERIFY_LIMIT = 5; // max wrong attempts per code

export interface MagicCodeResult {
  user: {
    id: string; projectId: string; email: string;
    name: string | null; emailVerified: boolean; createdAt: Date;
  };
  token: string;
  expiresAt: Date;
}

/**
 * BaaS magic-code (passwordless OTP) login for project end-users.
 *
 * Replaces the skeleton's broken magic-link (which generated a token that was
 * never emailed and never expired). A 6-digit code is generated, bcrypt-hashed
 * and stored in Redis (10m TTL) keyed by project+email, then emailed via
 * Stalwart (SmtpSendService, platform `from` omitted -> SMTP_FROM so sender-
 * identity checks are bypassed). Verify is rate-limited and find-or-creates the
 * AppUser (passwordless sign-up/in). Issues the existing opaque session token;
 * the JWT migration is Inc 5.
 */
@Injectable()
export class MagicCodeService {
  private readonly logger = new Logger(MagicCodeService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private smtp: SmtpSendService,
    private eventService: EventService,
    private rateLimiter: AuthRateLimiter,
  ) {}

  async requestCode(projectId: string, rawEmail: string, ipAddress?: string): Promise<{ sent: true }> {
    const email = rawEmail.toLowerCase().trim();
    const sendRl = await this.rateLimiter.consume(
      `rl:otp:send:${projectId}:${email}`, OTP_SEND_LIMIT, OTP_TTL_SEC,
    );
    if (!sendRl.allowed) {
      throw new HttpException('Too many code requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const hash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    await this.redis.set(`otp:hash:${projectId}:${email}`, hash, OTP_TTL_SEC);
    await this.redis.set(`otp:att:${projectId}:${email}`, 0, OTP_TTL_SEC);

    try {
      await this.smtp.send(projectId, {
        to: email,
        subject: 'Your sign-in code',
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your verification code is <strong style="font-size:20px;letter-spacing:4px">${code}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
      });
    } catch (err) {
      // Don't leak send failures to the client; log and still report sent.
      this.logger.error(`Failed to send magic code to ${email}: ${(err as Error).message}`);
    }

    await this.eventService.emit(
      'auth.magic_code_sent', { projectId, email },
      { actorType: 'user', resourceType: 'app_user', resourceId: email, ipAddress },
    );
    return { sent: true };
  }

  async verifyCode(projectId: string, rawEmail: string, code: string, ipAddress?: string): Promise<MagicCodeResult> {
    const email = rawEmail.toLowerCase().trim();
    const hashKey = `otp:hash:${projectId}:${email}`;
    const attKey = `otp:att:${projectId}:${email}`;

    const attempts = (await this.redis.get<number>(attKey)) ?? 0;
    if (attempts >= OTP_VERIFY_LIMIT) {
      throw new HttpException('Too many incorrect attempts. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const hash = await this.redis.get<string>(hashKey);
    if (!hash) throw new UnauthorizedException('Code expired or not requested');

    if (!(await bcrypt.compare(code, hash))) {
      await this.redis.set(attKey, attempts + 1, OTP_TTL_SEC);
      await this.eventService.emit('auth.login_failed', { projectId, email, method: 'magic_code' });
      throw new UnauthorizedException('Invalid code');
    }

    await this.redis.del(hashKey);
    await this.redis.del(attKey);

    // Find-or-create the app user (passwordless sign-up/in), mark email verified.
    let user = await this.prisma.appUser.findFirst({ where: { projectId, email } });
    if (!user) {
      user = await this.prisma.appUser.create({ data: { projectId, email, emailVerified: true } });
      await this.eventService.emit('auth.user_created', { userId: user.id, projectId, email });
    } else if (!user.emailVerified) {
      await this.prisma.appUser.update({ where: { id: user.id }, data: { emailVerified: true } });
      user.emailVerified = true;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.appSession.create({
      data: { userId: user.id, tokenHash: await bcrypt.hash(token, BCRYPT_ROUNDS), expiresAt },
    });

    await this.eventService.emit(
      'auth.magic_code_verified', { userId: user.id, projectId, email },
      { actorId: user.id, actorType: 'user', resourceType: 'app_user', resourceId: user.id, ipAddress },
    );
    await this.eventService.emit('auth.login_succeeded', { userId: user.id, projectId, email });

    return {
      user: {
        id: user.id, projectId: user.projectId, email: user.email,
        name: user.name, emailVerified: user.emailVerified, createdAt: user.createdAt,
      },
      token, expiresAt,
    };
  }
}
