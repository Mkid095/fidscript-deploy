import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtBlocklistService } from '@/common/jwt-blocklist.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
  sessionId?: string;
}

export interface VerifiedCaller {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
  emailVerifiedAt: Date | null;
}

/**
 * What a bearer token has to prove before it is worth anything.
 *
 * There were two places that decided this, and they disagreed. The session
 * strategy checked the token's **type**, the **session**, and the
 * **revocation list**. The composite API-key/JWT guard only checked the
 * signature — so a **refresh token** (seven days) presented as a bearer
 * token authenticated as the user on every route the guard guarded, and it
 * **survived logout**, because the logout tombstone is only consulted by the
 * strategy.
 *
 * There is one implementation now, and both callers use it.
 */
@Injectable()
export class AccessTokenService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private jwtBlocklist: JwtBlocklistService,
  ) {}

  /**
   * Verify a bearer token and resolve the caller it names.
   *
   * Throws `UnauthorizedException` when the token is not an access token, is
   * not valid, names no live session, or names a revoked one.
   */
  async verify(token: string): Promise<VerifiedCaller> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return this.verifyClaims(payload);
  }

  /**
   * The checks that decide whether a verified token is still worth anything.
   *
   * Split out from `verify` so that the session strategy — which has
   * already checked the signature by the time it gets here — and the
   * composite guard apply exactly the same rules.
   */
  async verifyClaims(payload: AccessTokenPayload): Promise<VerifiedCaller> {
    // Only an ACCESS token is a credential for the API. A refresh token is a
    // credential for exactly one thing: getting a new access token.
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Fast-path revocation check: if logout (or another revocation event)
    // wrote a tombstone for this sessionId, reject before any DB hit. Redis
    // is the deny-fast cache; the session check below remains the source of
    // truth if Redis is unavailable.
    if (payload.sessionId && (await this.jwtBlocklist.isRevoked(payload.sessionId))) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, emailVerifiedAt: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Enforce session validity on every guarded request. JWTs are stateless,
    // so without this check a revoked or expired Session row would NOT
    // invalidate the access token — it would stay usable until its own
    // 15-minute expiry.
    if (payload.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { expiresAt: true },
      });
      if (!session || session.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Session expired or revoked');
      }
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: payload.sessionId,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
