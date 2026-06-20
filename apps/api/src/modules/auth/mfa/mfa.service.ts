import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';
import { resolveJwtSecret } from '@/common/secrets';
import { generateSecret, verifySync, generateURI } from 'otplib';

const MFA_CHALLENGE_TTL_SEC = 5 * 60;
const ISSUER = 'FIDScript Deploy';

export interface MfaUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Platform-user TOTP MFA (Phase 03 gap: mfaEnabled existed but was never enforced).
 *
 * Flow: setup() generates a secret (stored AES-256-GCM encrypted) + otpauth URL for
 * the authenticator; enable() confirms the first code and flips mfaEnabled; at login,
 * if mfaEnabled, the password path issues a short-lived mfa_challenge JWT instead of
 * full tokens; completeChallenge() verifies the TOTP code against it and returns the
 * user so AuthService can mint a real session.
 */
@Injectable()
export class MfaService {
  private readonly jwtSecret: string;

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private jwtService: JwtService,
    private eventService: EventService,
    configService: ConfigService,
  ) {
    this.jwtSecret = resolveJwtSecret(configService);
  }

  async setup(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: this.crypto.encrypt(secret) },
    });
    await this.eventService.emit(
      'identity.user.mfa_setup',
      {},
      { actorId: userId, actorType: 'user', resourceType: 'user', resourceId: userId },
    );
    return { secret, otpauthUrl: generateURI({ issuer: ISSUER, label: user.email, secret }) };
  }

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
      'identity.user.mfa_enabled',
      {},
      { actorId: userId, actorType: 'user', resourceType: 'user', resourceId: userId },
    );
    return { enabled: true };
  }

  /** Short-lived challenge token issued after a correct password for an MFA-enabled user. */
  issueChallenge(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'mfa_challenge' },
      { expiresIn: `${MFA_CHALLENGE_TTL_SEC}s`, secret: this.jwtSecret },
    );
  }

  /** Verify the TOTP code against a challenge token; returns the user for session minting. */
  async completeChallenge(
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, mfaEnabled: true, mfaSecret: true },
    });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA not enabled');
    }

    const result = verifySync({ secret: this.crypto.decrypt(user.mfaSecret), token: code });
    if (!result.valid) throw new UnauthorizedException('Invalid MFA code');

    await this.eventService.emit(
      'identity.user.mfa_challenge',
      {},
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
