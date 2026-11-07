import { Injectable, Logger, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { MfaChallengeService } from '@/modules/auth/mfa/mfa-challenge.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
// Login brute-force protection (Phase 03 gap): Redis-backed fixed-window limits.
const LOGIN_IP_LIMIT = 100; // max attempts per IP within the window
const LOGIN_ACCT_LIMIT = 20; // max failed attempts per account within the window
const LOGIN_WINDOW_SEC = 5 * 60; // 5 minutes (was 15 — too long for dev)

interface LoginResult {
  user: { id: string; email: string; name: string | null; role: string };
  /** Present when MFA is required — caller must not mint a session yet. */
  mfaToken?: string;
}

@Injectable()
export class AuthLoginService {
  private readonly logger = new Logger(AuthLoginService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private rateLimiter: AuthRateLimiter,
    private mfaService: MfaChallengeService,
  ) {}

  async login(dto: { email: string; password: string }, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    // Rate limiting: a per-IP cap, always, and a per-account counter.
    const acctKey = `rl:login:fail:${dto.email.toLowerCase()}`;
    if (ipAddress) {
      const ipRl = await this.rateLimiter.consume(
        `rl:login:ip:${ipAddress}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_SEC,
      );
      if (!ipRl.allowed) {
        throw new HttpException('Too many login attempts from this address. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    // Emails are stored and looked up lowercased, everywhere else in the
    // platform. This lookup was the one that did not — so an account whose
    // address was saved with capitals could never sign in.
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // The counter is keyed on the address that was typed, whether or not it
    // belongs to anybody. It used to be consumed only for addresses that DO
    // have an account — so an address nobody owns never locked out, and one
    // that does locked out after twenty tries. The difference was an oracle
    // with a twenty-try head start. The cost: a known address can be locked
    // for five minutes by somebody guessing it.
    if ((await this.rateLimiter.count(acctKey)) >= LOGIN_ACCT_LIMIT) {
      throw new HttpException(
        'Too many attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!user) {
      await this.fail(acctKey, dto.email, 'user_not_found', 'unknown', ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // A magic-code account may still have a PASSWORD credential — the
    // credential table is the source of truth, not the preference.
    //
    // The answer is the same one an unknown address gets. It used to say
    // "this account uses magic code login" — telling an unauthenticated
    // caller that the address HAS an account, before the password was even
    // looked at. An enumeration oracle, wearing a helpful message.
    if (user.preferredAuthMethod === 'MAGIC_CODE') {
      const hasPasswordCredential = await this.prisma.userCredential.findFirst({
        where: { userId: user.id, type: 'PASSWORD' },
        select: { id: true },
      });
      if (!hasPasswordCredential) {
        await this.fail(acctKey, dto.email, 'magic_code_account', user.id, ipAddress, userAgent);
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (!user.passwordHash) {
      await this.fail(acctKey, dto.email, 'no_password', user.id, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed', null,
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
      'identity.user.logged_in', null,
      { email: user.email },
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return loginResult;
  }

  /**
   * A failed attempt: the counter, and the audit trail.
   *
   * Every failure counts against the address that was typed — whether or not
   * it belongs to anybody — so the lockout cannot be used to find out who
   * has an account.
   */
  private async fail(
    acctKey: string,
    email: string,
    reason: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
    await this.eventService.emit(
      'identity.user.login_failed', null,
      { email, reason },
      { actorId: userId, actorType: 'user', resourceType: 'user', resourceId: userId, ipAddress, userAgent },
    );
  }

}
