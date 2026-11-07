import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import { AuthVerificationEmailService, type VerificationKind } from './auth-verification-email';
import * as crypto from 'crypto';

const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;
const MAGIC_LINK_TTL_MINUTES = 15;

/**
 * Sending a verification, a reset or a sign-in link, and confirming an email
 * address.
 *
 * Tokens are cryptographically random and stored in plain in
 * `VerificationToken.token` — the column is the lookup key, so the URL
 * parameter finds the row.
 *
 * The request **always says "sent"**. It used to answer 404 for an address
 * with no account — an account-enumeration oracle hiding behind a form
 * whose copy promises it will not.
 *
 * The reset and the magic link live in `AuthPasswordResetService`.
 */
@Injectable()
export class AuthVerificationService {
  private readonly logger = new Logger(AuthVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private mail: PlatformMailService,
    private email: AuthVerificationEmailService,
  ) {}

  /** Sends a verification, reset or sign-in link. Always answers "sent". */
  async sendVerification(
    dto: { email: string; type: VerificationKind },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ sent: boolean }> {
    const normalized = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    const expiry =
      dto.type === 'EMAIL_VERIFY'
        ? `${EMAIL_VERIFY_TTL_HOURS} hours`
        : dto.type === 'PASSWORD_RESET'
          ? `${PASSWORD_RESET_TTL_HOURS} hour`
          : `${MAGIC_LINK_TTL_MINUTES} minutes`;

    if (user) {
      // Only one live token of each kind at a time — asking again replaces it.
      await this.prisma.verificationToken.updateMany({
        where: { userId: user.id, type: dto.type, consumed: false },
        data: { consumed: true },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() +
          (dto.type === 'EMAIL_VERIFY'
            ? EMAIL_VERIFY_TTL_HOURS
            : dto.type === 'PASSWORD_RESET'
              ? PASSWORD_RESET_TTL_HOURS
              : MAGIC_LINK_TTL_MINUTES / 60) *
            60 *
            60 *
            1000,
      );

      await this.prisma.verificationToken.create({
        data: { userId: user.id, token, type: dto.type, expiresAt },
      });

      const message = this.email.build(dto.type, token, expiry);
      try {
        await this.mail.send({ to: normalized, subject: message.subject, text: message.text, html: message.html });
      } catch (err) {
        // The token exists but the mail did not go out. Say nothing about the
        // account; log the failure with the reason.
        this.logger.warn(`Could not send the ${dto.type} email: ${(err as Error).message}`);
      }
    }

    await this.eventService.emit(
      dto.type === 'EMAIL_VERIFY'
        ? 'identity.user.email_verification_sent'
        : dto.type === 'PASSWORD_RESET'
          ? 'identity.user.password_reset_requested'
          : 'identity.user.magic_link_sent',
      null,
      { email: normalized },
      {
        actorId: user?.id,
        actorType: 'user',
        resourceType: 'user',
        resourceId: user?.id,
        ipAddress,
        userAgent,
      },
    );

    // Always "sent" — whether or not there is an account, and whether or not
    // the mail went out. The form says "if this address is registered, we
    // sent a link"; the API now keeps that promise.
    return { sent: true };
  }

  /** Confirms an email address. */
  async verifyEmail(dto: { token: string }, ipAddress?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });
    if (!record) throw new UnauthorizedException('Invalid or expired token');
    if (record.consumed) throw new BadRequestException('Token already used');
    if (record.type !== 'EMAIL_VERIFY') {
      throw new BadRequestException('Token is not an email verification token');
    }
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Token has expired');

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

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
}
