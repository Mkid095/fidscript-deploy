import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthSessionService, AuthResponse } from '@/modules/auth/services/auth-session.service';
import { MfaService } from '@/modules/auth/mfa/mfa.service';
import * as bcrypt from 'bcrypt';

const MAX_ATTEMPTS = 5;

/**
 * Platform magic-code login — the exchange (PREREQ-AUTH-3).
 *
 * The code is bcrypt-hashed, expires after ten minutes and is attempt-limited.
 * The sending lives in `AuthMagicCodeService`; this is the other half.
 */
@Injectable()
export class AuthMagicCodeVerifyService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private session: AuthSessionService,
    private mfa: MfaService,
  ) {}

  /**
   * Exchange the code for a session.
   *
   * An account with MFA enrolled gets a challenge token instead of a
   * session — the same as the password path. The code arrives by email, so
   * without the second factor it is the *only* factor, and a mailbox that
   * is read by somebody else would be enough to sign in.
   */
  async verifyCode(
    dto: { email: string; code: string },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse | { mfaRequired: true; mfaToken: string }> {
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
      select: { id: true, email: true, name: true, role: true, mfaEnabled: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    // Consume the code + null out earlier unconsumed codes for this email.
    await this.prisma.magicCode.update({ where: { id: record.id }, data: { consumed: true, attempts } });
    await this.prisma.magicCode.updateMany({
      where: { email, consumed: false, id: { not: record.id } },
      data: { consumed: true },
    });

    // MFA is not optional here: the code came by email, so it is one
    // factor, not two.
    if (user.mfaEnabled) {
      await this.eventService.emit(
        'identity.user.magic_code_verified', null, { mfaRequired: true },
        { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
      );
      return { mfaRequired: true, mfaToken: this.mfa.issueChallenge(user.id) };
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const sess = await this.session.createSession(user.id, ipAddress, userAgent);

    await this.eventService.emit(
      'identity.user.magic_code_verified', null, {},
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return this.session.buildAuthResponse(user, sess);
  }

}
