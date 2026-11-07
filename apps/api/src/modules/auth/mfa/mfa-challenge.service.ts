import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { resolveJwtSecret } from '@/common/secrets';
import { MfaRecoveryCodeService } from './mfa-recovery-code.service';
import { verifySync } from 'otplib';
import * as crypto from 'crypto';

const MFA_CHALLENGE_TTL_SEC = 5 * 60;
// The challenge is a one-time window into a 10^6 code space. Five attempts
// per five minutes is enough for a person holding their phone.
const MFA_CHALLENGE_LIMIT = 5;
const MFA_CHALLENGE_WINDOW_SEC = 5 * 60;

/** A recovery code looks like `a1b2c3d4-e5f6` — never like a TOTP code. */
const RECOVERY_CODE_PATTERN = /^[a-z0-9]{8}-[a-z0-9]{6}$/;

export interface MfaUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * The second half of a sign-in.
 *
 * The password proved the first half; the challenge token is the proof of
 * it, and this is where the code — from the authenticator, or a recovery
 * code — turns it into a session.
 *
 * The endpoint was public, with no attempt counter, in front of a
 * million-code space for five minutes. It is counted now, in Redis, under a
 * **hash** of the challenge: the challenge is a bearer token and must not
 * become part of a key anybody might read.
 */
@Injectable()
export class MfaChallengeService {
  private readonly jwtSecret: string;

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private jwtService: JwtService,
    private eventService: EventService,
    private rateLimiter: AuthRateLimiter,
    private recoveryCodes: MfaRecoveryCodeService,
    configService: ConfigService,
  ) {
    this.jwtSecret = resolveJwtSecret(configService);
  }

  /** Short-lived challenge token issued after a correct password. */
  issueChallenge(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'mfa_challenge' },
      { expiresIn: `${MFA_CHALLENGE_TTL_SEC}s`, secret: this.jwtSecret },
    );
  }

  /**
   * Verifies a TOTP code or a recovery code against a challenge, and returns
   * the user so a real session can be minted.
   */
  async complete(
    challengeToken: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<MfaUser> {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(challengeToken, { secret: this.jwtSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA challenge');
    }
    if (payload.type !== 'mfa_challenge') {
      throw new UnauthorizedException('Invalid token type');
    }

    const limitKey = `rl:mfa:challenge:${this.challengeFingerprint(challengeToken)}`;
    const limit = await this.rateLimiter.consume(
      limitKey, MFA_CHALLENGE_LIMIT, MFA_CHALLENGE_WINDOW_SEC,
    );
    if (!limit.allowed) {
      throw new HttpException(
        'Too many attempts. Try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, mfaEnabled: true, mfaSecret: true },
    });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA not enabled');
    }

    const accepted = RECOVERY_CODE_PATTERN.test(code)
      ? await this.recoveryCodes.consume(user.id, code)
      : verifySync({ secret: this.crypto.decrypt(user.mfaSecret), token: code }).valid;

    if (!accepted) throw new UnauthorizedException('Invalid MFA code');

    await this.eventService.emit(
      'identity.user.mfa_challenge', null, {},
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  /**
   * A stable, non-reversible fingerprint of the challenge, used as the
   * rate-limit key.
   */
  private challengeFingerprint(challengeToken: string): string {
    return crypto.createHash('sha256').update(challengeToken).digest('hex').slice(0, 32);
  }
}
