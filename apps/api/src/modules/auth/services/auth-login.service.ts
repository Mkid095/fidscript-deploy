import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { MfaService } from '@/modules/auth/mfa/mfa.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
// Login brute-force protection (Phase 03 gap): Redis-backed fixed-window limits.
const LOGIN_IP_LIMIT = 30; // max attempts per IP within the window
const LOGIN_ACCT_LIMIT = 5; // max failed attempts per account within the window
const LOGIN_WINDOW_SEC = 15 * 60;

interface LoginResult {
  user: { id: string; email: string; name: string | null; role: string };
  /** Present when MFA is required — caller must not mint a session yet. */
  mfaToken?: string;
}

@Injectable()
export class AuthLoginService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private rateLimiter: AuthRateLimiter,
    private mfaService: MfaService,
  ) {}

  async login(dto: { email: string; password: string }, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    // Rate limiting (Phase 03 gap): per-IP attempt cap + per-account failure lockout.
    const acctKey = `rl:login:fail:${dto.email.toLowerCase()}`;
    if (ipAddress) {
      const ipRl = await this.rateLimiter.consume(
        `rl:login:ip:${ipAddress}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_SEC,
      );
      if (!ipRl.allowed) {
        throw new HttpException('Too many login attempts from this address. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    if ((await this.rateLimiter.count(acctKey)) >= LOGIN_ACCT_LIMIT) {
      throw new HttpException('Account temporarily locked after repeated failures. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed',
        { email: dto.email, reason: 'user_not_found' },
        { actorType: 'user', resourceType: 'user', resourceId: 'unknown', ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // If user prefers magic code, allow password login anyway when the user has
    // explicitly added a PASSWORD credential (preferredAuthMethod is just the
    // default surface in the UI; the credential table is the source of truth).
    if (user.preferredAuthMethod === 'MAGIC_CODE') {
      const hasPasswordCredential = await this.prisma.userCredential.findFirst({
        where: { userId: user.id, type: 'PASSWORD' },
        select: { id: true },
      });
      if (!hasPasswordCredential) {
        await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
        throw new UnauthorizedException(
          'This account uses magic code login. Use the magic code option instead.',
        );
      }
    }

    if (!user.passwordHash) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed',
        { email: dto.email, reason: 'no_password' },
        { actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed',
        { email: user.email, reason: 'invalid_password' },
        { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const loginResult: LoginResult = {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };

    // MFA-enrolled users get a short-lived challenge token instead of full tokens;
    // the real session is minted only after /auth/mfa/challenge verifies the code.
    if (user.mfaEnabled) {
      loginResult.mfaToken = this.mfaService.issueChallenge(user.id);
      return loginResult;
    }

    await this.eventService.emit(
      'identity.user.logged_in',
      { email: user.email },
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return loginResult;
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(0) },
    }).catch(() => {});

    await this.eventService.emit(
      'identity.user.logged_out',
      {},
      { actorId: userId, actorType: 'user', resourceType: 'session', resourceId: sessionId },
    );
  }
}
