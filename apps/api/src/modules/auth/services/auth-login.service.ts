import { Injectable, Logger, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { JwtBlocklistService } from '@/common/jwt-blocklist.service';
import { MfaService } from '@/modules/auth/mfa/mfa.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
// Login brute-force protection (Phase 03 gap): Redis-backed fixed-window limits.
const LOGIN_IP_LIMIT = 100; // max attempts per IP within the window
const LOGIN_ACCT_LIMIT = 20; // max failed attempts per account within the window
const LOGIN_WINDOW_SEC = 5 * 60; // 5 minutes (was 15 — too long for dev)
// Access JWT TTL — must match JwtModule.signOptions.expiresIn in auth.module.ts.
// Used to set the blocklist tombstone so it expires when the token would have.
const ACCESS_TOKEN_TTL_SEC = 15 * 60;

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
    private mfaService: MfaService,
    private jwtBlocklist: JwtBlocklistService,
  ) {}

  async login(dto: { email: string; password: string }, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    // Rate limiting: per-IP attempt cap (always). Per-account lockout is checked
    // only after confirming the user exists — this prevents probing valid emails
    // via the lockout threshold (user-not-found must NOT consume the account counter).
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
    // address was saved with capitals could never sign in, and the
    // auth-method lookup (which does lowercase) could not find it either.
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // The counter is keyed on the address that was typed, whether or not it
    // belongs to anybody. It used to be consumed only for addresses that
    // DO have an account — which meant an address nobody owns never locked
    // out, and one that does locked out after twenty tries. The difference
    // was an oracle with a twenty-try head start.
    //
    // The cost is that a known address can be locked for five minutes by
    // somebody guessing it. The per-IP limit still bounds that, and the lock
    // expires on its own.
    if ((await this.rateLimiter.count(acctKey)) >= LOGIN_ACCT_LIMIT) {
      throw new HttpException(
        'Too many attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!user) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed', null,
        { email: dto.email, reason: 'user_not_found' },
        { actorType: 'user', resourceType: 'user', resourceId: 'unknown', ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // If user prefers magic code, allow password login anyway when the user has
    // explicitly added a PASSWORD credential (preferredAuthMethod is just the
    // default surface in the UI; the credential table is the source of truth).
    //
    // The answer is the same one an unknown address gets. It used to say
    // "this account uses magic code login" — which told an unauthenticated
    // caller that the address HAS an account, before the password was even
    // looked at. An account-enumeration oracle, wearing a helpful message.
    if (user.preferredAuthMethod === 'MAGIC_CODE') {
      const hasPasswordCredential = await this.prisma.userCredential.findFirst({
        where: { userId: user.id, type: 'PASSWORD' },
        select: { id: true },
      });
      if (!hasPasswordCredential) {
        await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
        await this.eventService.emit(
          'identity.user.login_failed', null,
          { email: dto.email, reason: 'magic_code_account' },
          { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
        );
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (!user.passwordHash) {
      await this.rateLimiter.consume(acctKey, LOGIN_ACCT_LIMIT, LOGIN_WINDOW_SEC);
      await this.eventService.emit(
        'identity.user.login_failed', null,
        { email: dto.email, reason: 'no_password' },
        { actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
      );
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

  async logout(sessionId: string, userId: string): Promise<void> {
    // The failure used to be swallowed. That left the refresh token alive:
    // the access token died (the blocklist tombstone still fired), but a
    // captured refresh token could mint a new session after the person had
    // signed out. A failure here is logged, not hidden.
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(0) },
      });
    } catch (err) {
      this.logger.error(
        `Could not revoke session ${sessionId} on logout: ${(err as Error).message}`,
      );
      throw new UnauthorizedException('Could not sign you out — try again');
    }

    // Revoke the in-flight access JWT. The blocklist TTL is bounded by the
    // JWT's max lifetime — if the token is older, the JWT signature/expiry
    // check already rejects it; if newer, the tombstone lives just past the
    // token's natural expiry. Either way the token can no longer be replayed.
    await this.jwtBlocklist.revoke(sessionId, ACCESS_TOKEN_TTL_SEC);

    await this.eventService.emit(
      'identity.user.logged_out', null, {},
      { actorId: userId, actorType: 'user', resourceType: 'session', resourceId: sessionId },
    );
  }
}
