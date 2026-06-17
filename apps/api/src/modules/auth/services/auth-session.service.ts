import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: { userId, tokenHash: refreshTokenHash, expiresAt, ipAddress, userAgent },
    });

    await this.eventService.emit('identity.session.created', {
      id: crypto.randomUUID(), type: 'identity.session.created',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'session', resourceId: session.id, metadata: {}, ipAddress, userAgent,
    });

    return { id: session.id, refreshToken, expiresAt };
  }

  buildAuthResponse(
    user: { id: string; email: string; name: string | null; role: string },
    session: { id: string; refreshToken: string; expiresAt: Date },
  ): AuthResponse {
    const payload = { sub: user.id, email: user.email, role: user.role, type: 'access' as const };
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken: this.jwtService.sign(payload),
      refreshToken: session.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
