import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { resolveJwtSecret, resolveJwtSecrets } from '@/common/secrets';
import { generateSecret, verifySync, generateURI } from 'otplib';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const MFA_CHALLENGE_TTL_SEC = 5 * 60;
// The challenge is a one-time window into a 10^6 code space. Five attempts
// per five minutes is enough for a person holding their phone.
const MFA_CHALLENGE_LIMIT = 5;
const MFA_CHALLENGE_WINDOW_SEC = 5 * 60;
const RECOVERY_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 10;
const ISSUER = 'FIDScript Deploy';

/** A recovery code looks like `a1b2c3d4-e5f6` — never like a TOTP code. */
const RECOVERY_CODE_PATTERN = /^[a-z0-9]{8}-[a-z0-9]{6}$/;

export interface MfaUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Platform-user TOTP MFA.
 *
 * Flow: `setup()` generates a secret (stored AES-256-GCM encrypted) and an
 * otpauth URL for the authenticator; `enable()` confirms the first code and
 * flips `mfaEnabled`; at login, an MFA-enabled account is issued a
 * short-lived `mfa_challenge` JWT instead of tokens, and `completeChallenge()`
 * verifies the code and returns the user so a real session can be minted.
 *
 * What this version adds:
 *
 * - **Recovery codes.** A person who loses their authenticator still has to
 *   get back in. Ten single-use codes, stored as bcrypt hashes, shown once.
 * - **A safe setup.** Re-running setup while MFA is enabled used to replace
 *   the secret with no check — a self-service reset of one's own second
 *   factor. It now needs the current factor.
 * - **A disable.** There was no way to turn MFA off, and no way to turn it
 *   on from the dashboard. Disabling needs a reauthentication.
 * - **A rate-limited challenge.** The challenge endpoint was public, had no
 *   attempt counter, and sat in front of a 10^6 code space for five minutes.
 */
@Injectable()
export class MfaService {
  private readonly jwtSecret: string;

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private jwtService: JwtService,
    private eventService: EventService,
    private rateLimiter: AuthRateLimiter,
    private config: ConfigService,
  ) {
    // Signing uses the current secret; verification accepts the rotation
    // list (current + the one being retired), read at verify time so a
    // rotation is picked up without a second field.
    this.jwtSecret = resolveJwtSecret(config);
  }

  // ── Enrollment ─────────────────────────────────────────────────────────────

  /**
   * Generates a secret and the otpauth URL for an authenticator app.
   *
   * When MFA is already enabled, the current factor is required — otherwise
   * a stolen session could replace somebody's second factor and lock them
   * out of their own account.
   */
  async setup(
    userId: string,
    currentCode?: string,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.mfaEnabled) {
      if (!currentCode) {
        throw new BadRequestException(
          'MFA is already enabled — confirm it with a code from your authenticator to replace it.',
        );
      }
      if (!user.mfaSecret) throw new BadRequestException('MFA is not set up properly');
      const result = verifySync({ secret: this.crypto.decrypt(user.mfaSecret), token: currentCode });
      if (!result.valid) throw new UnauthorizedException('Invalid MFA code');
    }

    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: this.crypto.encrypt(secret) },
    });
    await this.eventService.emit(
      'identity.user.mfa_setup', null, {},
      { actorId: userId, actorType: 'user', resourceType: 'user', resourceId: userId },
    );
    return { secret, otpauthUrl: generateURI({ issuer: ISSUER, label: user.email, secret }) };
  }

  /** Confirms the first code and turns MFA on. */
  async enable(userId: string, code: string): Promise<{ enabled: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaSecret: true },
    });
    if (!user || !user.mfaSecret) {
      throw new NotFoundException('MFA not set up — call /auth/mfa/setup first');
    }
    const result = verifySync({ secret: this.crypto.decrypt(user.mfaSecret), token: code });
    if (!result.valid) throw new UnauthorizedException('Invalid MFA code');

    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await this.eventService.emit(
      'identity.user.mfa_enabled', null, {},
      { actorId: userId, actorType: 'user', resourceType: 'user', resourceId: userId },
    );
    return { enabled: true };
  }

  /**
   * Turns MFA off.
   *
   * Needs a reauthentication: the account's password, or a code from the
   * authenticator. A session alone is not enough to remove a second factor.
   */
  async disable(
    userId: string,
    proof: { password?: string; code?: string },
  ): Promise<{ disabled: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, mfaSecret: true, mfaEnabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    const password = proof.password ?? '';
    const code = proof.code ?? '';
    let authenticated = false;

    if (password && user.passwordHash) {
      authenticated = await bcrypt.compare(password, user.passwordHash);
    }
    if (!authenticated && code && user.mfaSecret) {
      authenticated = verifySync({ secret: this.crypto.decrypt(user.mfaSecret), token: code }).valid;
    }
    if (!authenticated) {
      throw new UnauthorizedException(
        'Confirm it is you — enter your password or a code from your authenticator.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
    await this.eventService.emit(
      'identity.user.mfa_disabled', null, {},
      { actorId: userId, actorType: 'user', resourceType: 'user', resourceId: userId },
    );
    return { disabled: true };
  }

  // ── Recovery codes ─────────────────────────────────────────────────────────

  /**
   * Generates a fresh set of recovery codes and returns them in plain.
   *
   * This is the only time they are readable. The stored form is a bcrypt
   * hash, like the magic codes — a database read does not hand anybody the
   * ability to get back into the account.
   */
  async generateRecoveryCodes(userId: string): Promise<{ codes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaEnabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.mfaEnabled) {
      throw new BadRequestException('Turn MFA on before generating recovery codes.');
    }

    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => this.newRecoveryCode());
    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
    await this.prisma.mfaRecoveryCode.createMany({
      data: codes.map((code) => ({
        userId,
        codeHash: bcrypt.hashSync(code, BCRYPT_ROUNDS),
      })),
    });
    return { codes };
  }

  /** Whether MFA is on for this account. */
  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    return Boolean(user?.mfaEnabled);
  }

  /** How many recovery codes are still unused. */
  async remainingRecoveryCodes(userId: string): Promise<{ remaining: number }> {
    const remaining = await this.prisma.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });
    return { remaining };
  }

  /** Consumes a recovery code, if it is one and it is unused. */
  private async consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
    const candidates = await this.prisma.mfaRecoveryCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, codeHash: true },
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.codeHash)) {
        await this.prisma.mfaRecoveryCode.update({
          where: { id: candidate.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  private newRecoveryCode(): string {
    const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
    const pick = (n: number) =>
      Array.from({ length: n }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
    return `${pick(8)}-${pick(6)}`;
  }

  // ── The challenge ──────────────────────────────────────────────────────────

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
  async completeChallenge(
    challengeToken: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<MfaUser> {
    let payload: { sub: string; type: string };
    try {
      // A challenge minted before a rotation is still owed its window, so
      // the signature is accepted from any secret in the rotation list.
      let matched: { sub: string; type: string } | null = null;
      for (const secret of resolveJwtSecrets(this.config)) {
        try {
          matched = this.jwtService.verify<{ sub: string; type: string }>(
            challengeToken,
            { secret },
          );
          break;
        } catch {
          /* try the next secret in the list */
        }
      }
      if (!matched) throw new Error('no secret matched');
      payload = matched;
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA challenge');
    }
    if (payload.type !== 'mfa_challenge') {
      throw new UnauthorizedException('Invalid token type');
    }

    // The challenge is a window into a 10^6 code space. Count the attempts.
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
      ? await this.consumeRecoveryCode(user.id, code)
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
   * rate-limit key. The challenge itself is a bearer token — it must not
   * become part of a Redis key that anybody might read.
   */
  private challengeFingerprint(challengeToken: string): string {
    return crypto.createHash('sha256').update(challengeToken).digest('hex').slice(0, 32);
  }
}
