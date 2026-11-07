import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';
import { MfaRecoveryCodeService } from './mfa-recovery-code.service';
import { generateSecret, verifySync, generateURI } from 'otplib';
import * as bcrypt from 'bcrypt';

const ISSUER = 'FIDScript Deploy';
/**
 * Platform-user TOTP MFA — the enrollment.
 *
 * `setup()` generates a secret (stored AES-256-GCM encrypted) and an otpauth
 * URL for the authenticator; `enable()` confirms the first code and flips
 * `mfaEnabled`.
 *
 * What this version adds: **a safe setup** (re-running it while MFA is
 * enabled used to replace the secret with no check — a self-service reset of
 * one's own second factor) and **a disable** (there was no way to turn MFA
 * off at all, and no way to turn it on from the dashboard).
 *
 * The recovery codes live in `MfaRecoveryCodeService`; the challenge in
 * `MfaChallengeService`.
 */
@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private eventService: EventService,
    private recoveryCodes: MfaRecoveryCodeService,
  ) {}

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
    await this.recoveryCodes.clear(userId);
    await this.eventService.emit(
      'identity.user.mfa_disabled', null, {},
      { actorId: userId, actorType: 'user', resourceType: 'user', resourceId: userId },
    );
    return { disabled: true };
  }

  /** Whether MFA is on for this account. */
  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    return Boolean(user?.mfaEnabled);
  }
}
