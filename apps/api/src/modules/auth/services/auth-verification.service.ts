import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import { AuthVerificationEmailService, type VerificationKind } from './auth-verification-email';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;
const MAGIC_LINK_TTL_MINUTES = 15;

/**
 * Verification token lifecycle: email verification, password reset, magic link.
 *
 * Tokens are cryptographically random and stored in plain in
 * `VerificationToken.token` — the column is the lookup key, so the URL
 * parameter finds the row.
 *
 * Two things were wrong and are fixed here:
 *
 * 1. **A password reset did not change the password.** It wrote the
 *    `UserCredential` row, but login reads `User.passwordHash` — so the new
 *    password was accepted by nothing and the account was locked out of its
 *    own reset.
 * 2. **The reset request said whether the account existed.** It answered 404
 *    for an address with no account, which is an account-enumeration oracle
 *    hiding behind a form whose copy promises it will not. It now always
 *    says "sent".
 */
@Injectable()
export class AuthVerificationService {
  private readonly logger = new Logger(AuthVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private mail: PlatformMailService,
    private session: AuthSessionService,
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

  /** Sets a new password from a reset token, and ends every session. */
  async confirmPasswordReset(dto: { token: string; newPassword: string }, ipAddress?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });
    if (!record) throw new UnauthorizedException('Invalid or expired token');
    if (record.consumed) throw new BadRequestException('Token already used');
    if (record.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Token is not a password reset token');
    }
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Token has expired');

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // BOTH columns. Login verifies against `User.passwordHash`; the
    // credential table is what the rest of the platform reads. Writing only
    // one of them is how the reset used to leave the account locked out.
    await this.prisma.userCredential.upsert({
      where: { userId_type: { userId: user.id, type: 'PASSWORD' } },
      create: { userId: user.id, type: 'PASSWORD', secretHash: passwordHash },
      update: { secretHash: passwordHash },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    // A reset ends every session, including the one that asked for it.
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

  /** Confirms a magic link and signs the person in. */
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
}
