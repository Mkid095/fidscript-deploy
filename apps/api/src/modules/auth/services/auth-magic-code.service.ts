import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import { magicCodeHtml, magicCodeText } from '@/modules/auth/services/auth-magic-code-email';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const CODE_TTL_MINUTES = 10;
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
    // The code is NOT logged. It was, in the clear, next to the address it
    // was sent to — so anyone who could read the API log could sign in as
    // that person. What is logged is that a code was issued.
    this.logger.log(`MAGIC_CODE issued for ${email}`);
    const codeHash = await bcrypt.hash(code, 10); // 6-digit codes are low-entropy; hash for defense-in-depth
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.prisma.magicCode.create({ data: { email, codeHash, expiresAt } });

    const result = await this.mail.send({
      to: email,
      subject: 'Your FIDScript login code',
      text: magicCodeText(code),
      html: magicCodeHtml(code),
    });

    await this.eventService.emit(
      'identity.user.magic_code_sent', null,
      { delivered: result.status === 'sent' },
      { actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return { sent: true };
  }

  private generateCode(): string {
    // Uniform 6-digit code (0-padded). crypto.randomInt avoids modulo bias.
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }
}
