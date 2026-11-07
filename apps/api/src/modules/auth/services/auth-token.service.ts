import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface RefreshTokenPayload { sub: string; type: 'refresh'; sessionId: string; }

@Injectable()
export class AuthTokenService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eventService: EventService,
  ) {}

  async refreshToken(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

    const session = await this.prisma.session.findFirst({
      where: { id: payload.sessionId, userId: payload.sub, expiresAt: { gt: new Date() } },
    });
    if (!session) throw new UnauthorizedException('Session revoked or expired');

    // The session row holds a bcrypt hash of the refresh token. It was
    // written and never read — so the token could be replayed until the
    // session flipped, and the hash bought nothing. The application's own
    // session path has always done this comparison.
    if (session.tokenHash && session.tokenHash !== 'pending') {
      const matches = await bcrypt.compare(refreshToken, session.tokenHash);
      if (!matches) {
        // A refresh token that does not match the session it names is a
        // replay. End the session: the legitimate holder is forced to sign
        // in again, and the replayed copy is worthless.
        await this.prisma.session.update({
          where: { id: session.id }, data: { expiresAt: new Date(0) },
        });
        await this.eventService.emit(
          'auth.refresh_rejected', null, {},
          { actorId: payload.sub, actorType: 'user', resourceType: 'session', resourceId: session.id },
        );
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.session.update({
      where: { id: session.id }, data: { expiresAt: new Date(0) },
    });

    await this.eventService.emit(
      'identity.token.refreshed',
      null,
      { rotatedFrom: session.id },
      { actorId: user.id, actorType: 'user', resourceType: 'session', resourceId: session.id },
    );

    return { user, oldSession: session };
  }

  get accessTokenTtl() { return ACCESS_TOKEN_TTL_SECONDS; }
}
