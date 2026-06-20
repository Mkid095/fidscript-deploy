import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface RefreshTokenPayload { sub: string; type: 'refresh'; sessionId: string; }

@Injectable()
export class AuthTokenService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eventService: EventService,
  ) {}

  async magicLink(dto: { email: string }): Promise<{ sent: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { sent: true };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.session.create({
      data: { userId: user.id, tokenHash: await bcrypt.hash(token, BCRYPT_ROUNDS), expiresAt },
    });

    return { sent: true };
  }

  async verifyMagicLink(dto: { token: string }, ipAddress?: string) {
    const sessions = await this.prisma.session.findMany({
      where: { expiresAt: { gt: new Date() }, user: { email: dto.token } },
      orderBy: { createdAt: 'desc' }, take: 1,
    });
    if (!sessions.length) throw new UnauthorizedException('Invalid or expired token');

    const session = sessions[0];
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.session.delete({ where: { id: session.id } });
    return { user, session, ipAddress };
  }

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
      { rotatedFrom: session.id },
      {
        actorId: user.id,
        actorType: 'user',
        resourceType: 'session',
        resourceId: session.id,
      },
    );

    return { user, oldSession: session };
  }

  buildAccessToken(user: { id: string; email: string; role: string }): string {
    const payload = { sub: user.id, email: user.email, role: user.role, type: 'access' as const };
    return this.jwtService.sign(payload);
  }

  get accessTokenTtl() { return ACCESS_TOKEN_TTL_SECONDS; }
}
