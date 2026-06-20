import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveJwtSecret } from '@/common/secrets';

interface AccessPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  async validate(payload: AccessPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Enforce session validity on every guarded request. JWTs are stateless, so
    // without this check a revoked/expired Session row (logout, change-password
    // rotation, DELETE /sessions/:id) would NOT invalidate the access token — it
    // would stay usable until its own 15-min expiry. Found under live
    // verification 2026-06-20 (logout did not actually 401 the next call).
    if (payload.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { expiresAt: true },
      });
      if (!session || session.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException('Session expired or revoked');
      }
    }

    // sessionId travels in the access JWT so logout can revoke the originating
    // session without an extra lookup. Refresh tokens carry it too.
    return { userId: user.id, email: user.email, role: user.role, sessionId: payload.sessionId };
  }
}
