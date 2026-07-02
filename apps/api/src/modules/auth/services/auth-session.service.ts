import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 7;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AuthResponse {
  user: { id: string; email: string; name: string | null; role: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthSessionService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eventService: EventService,
  ) {}

  async createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    // Create the session row first so we have its id, then mint a refresh JWT
    // carrying that sessionId. The refresh token is a SIGNED JWT (not an opaque
    // string) because AuthTokenService.refreshToken verifies it as a JWT — the
    // previous opaque token made /auth/refresh always 401.
    const session = await this.prisma.session.create({
      data: { userId, tokenHash: 'pending', expiresAt, ipAddress, userAgent },
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh', sessionId: session.id },
      { expiresIn: `${REFRESH_TOKEN_DAYS}d` },
    );
    // Store a hash of the refresh token (a raw JWT exceeds VarChar(255)). The
    // session row is the revocation record; refresh validity is enforced by JWT
    // signature + session.expiresAt in AuthTokenService.refreshToken.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { tokenHash: await bcrypt.hash(refreshToken, BCRYPT_ROUNDS) },
    });

    await this.eventService.emit(
      'identity.session.created',
      null,
      { ipAddress, userAgent },
      { actorId: userId, actorType: 'user', resourceType: 'session', resourceId: session.id },
    );

    return { id: session.id, refreshToken, expiresAt };
  }

  buildAuthResponse(
    user: { id: string; email: string; name: string | null; role: string },
    session: { id: string; refreshToken: string; expiresAt: Date },
  ): AuthResponse {
    // sessionId travels in the access JWT so logout can revoke the originating
    // session (JwtStrategy.validate surfaces it on request.user).
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      type: 'access' as const,
    };
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken: this.jwtService.sign(payload),
      refreshToken: session.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
