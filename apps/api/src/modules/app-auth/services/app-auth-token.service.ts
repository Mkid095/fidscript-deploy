import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { resolveJwtSecret } from '@/common/secrets';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SEC = 15 * 60;
const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 60 * 60;

export interface AppAccessPayload {
  scope: 'app';
  projectId: string;
  sub: string;            // appUserId
  email: string;
  sessionId: string;
  type: 'access';
}

export interface AppRefreshPayload {
  scope: 'app';
  projectId: string;
  sub: string;
  sessionId: string;
  type: 'refresh';
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class AppAuthTokenService {
  private readonly secret: string;

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private eventService: EventService,
    configService: ConfigService,
  ) {
    this.secret = resolveJwtSecret(configService);
  }

  /** Issue an access + refresh JWT pair; persists the refresh token hash. */
  async issueTokens(
    appUserId: string,
    projectId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);

    // 1) Create the session row first to get an id (so we can put it in both tokens).
    //    Placeholder hash; we update once we have the refresh token.
    const session = await this.prisma.appSession.create({
      data: {
        userId: appUserId,
        tokenHash: 'pending',
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    const accessPayload: AppAccessPayload = {
      scope: 'app',
      projectId,
      sub: appUserId,
      email,
      sessionId: session.id,
      type: 'access',
    };
    const accessToken = this.jwt.sign(accessPayload, {
      secret: this.secret,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
    });

    const refreshPayload: AppRefreshPayload = {
      scope: 'app',
      projectId,
      sub: appUserId,
      sessionId: session.id,
      type: 'refresh',
    };
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.secret,
      expiresIn: REFRESH_TOKEN_TTL_SEC,
    });

    // 2) Now hash the refresh token and persist it as the session's tokenHash.
    //    bcrypt-12 = ~250ms; only paid once per login/refresh.
    const refreshHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.appSession.update({
      where: { id: session.id },
      data: { tokenHash: refreshHash, lastUsedAt: new Date() },
    });

    return { accessToken, refreshToken, expiresAt };
  }

  /** Consume a refresh JWT, rotate (expire old, mint new), return fresh tokens. */
  async rotateRefresh(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<IssuedTokens> {
    let payload: AppRefreshPayload;
    try {
      payload = this.jwt.verify<AppRefreshPayload>(refreshToken, { secret: this.secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.scope !== 'app' || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.appSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session revoked or expired');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Session subject mismatch');
    }

    const valid = await bcrypt.compare(refreshToken, session.tokenHash);
    if (!valid) {
      // Token presented doesn't match our hash — possible theft/replay.
      // Revoke the entire session and alert.
      await this.prisma.appSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      await this.eventService.emit('auth.refresh_rejected', session.user.projectId, {
        userId: session.userId,
        sessionId: session.id,
      }, { actorId: session.userId, ipAddress, userAgent });
      throw new UnauthorizedException('Refresh token mismatch — session revoked');
    }

    // Rotate: mark old session revoked, issue new session+token pair.
    await this.prisma.appSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(
      session.userId,
      session.user.projectId,
      session.user.email,
      ipAddress,
      userAgent,
    );
    await this.eventService.emit('auth.token_refreshed', session.user.projectId, {
      userId: session.userId,
      sessionId: tokens.expiresAt,
    }, { actorId: session.userId, ipAddress, userAgent });
    return tokens;
  }

  /** Revoke a session (logout). */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.appSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    }).catch(() => {});
  }
}