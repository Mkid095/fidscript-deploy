import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtTokenVerifier } from '@/common/jwt-token-verifier.service';

export interface AppAccessJwtPayload {
  scope: 'app';
  projectId: string;
  sub: string;
  email: string;
  sessionId: string;
  type: 'access';
}

export interface AppAuthUser {
  appUserId: string;
  projectId: string;
  email: string;
  sessionId: string;
}

@Injectable()
export class AppJwtStrategy extends PassportStrategy(Strategy, 'app-jwt') {
  constructor(
    private prisma: PrismaService,
    verifier: JwtTokenVerifier,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Same rotation model as the session strategy, on passport-jwt's
      // dynamic-secret hook: `secretOrKeyProvider` resolves a key per
      // request, while `secretOrKey` is a fixed value that is never called.
      secretOrKeyProvider: ((request: unknown, rawToken: string, done: (err: Error | null, secret?: string) => void) => {
        for (const secret of verifier.secrets()) {
          try {
            jwt.verify(rawToken, secret, { algorithms: ['HS256'] });
            done(null, secret);
            return;
          } catch {
            /* the next key in the rotation list */
          }
        }
        done(new UnauthorizedException('Invalid token signature'));
      }) as never,
    });
  }

  async validate(payload: AppAccessJwtPayload): Promise<AppAuthUser> {
    if (payload.scope !== 'app' || payload.type !== 'access') {
      throw new UnauthorizedException('Not an app token');
    }

    // Check session is still active.
    const session = await this.prisma.appSession.findUnique({
      where: { id: payload.sessionId },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session revoked or expired');
    }

    // Load the user. It has no roles: an application's permissions are
    // Instant's CEL rules, not a JSON blob on a platform-side role.
    const user = await this.prisma.appUser.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.projectId !== payload.projectId) {
      throw new UnauthorizedException('User no longer valid');
    }

    // Touch last_used_at (fire and forget — don't block auth on this).
    void this.prisma.appSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      appUserId: user.id,
      projectId: user.projectId,
      email: user.email,
      sessionId: session.id,
    };
  }
}