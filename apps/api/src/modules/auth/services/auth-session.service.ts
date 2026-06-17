import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_DAYS = 7;

export interface AuthResponse {
  user: { id: string; email: string; name: string | null; role: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenPayload { sub: string; type: 'refresh'; sessionId: string; }

@Injectable()
export class AuthSessionService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eventService: EventService,
  ) {}

  async register(dto: { email: string; password: string; name?: string }, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({ data: { email: dto.email, passwordHash, name: dto.name } });

    const session = await this.createSession(user.id, ipAddress, userAgent);

    await this.eventService.emit('identity.user.registered', {
      id: crypto.randomUUID(), type: 'identity.user.registered',
      timestamp: new Date(), actorId: user.id, actorType: 'user',
      resourceType: 'user', resourceId: user.id,
      metadata: { email: user.email, name: user.name }, ipAddress, userAgent,
    });

    return this.buildAuthResponse(user, session);
  }

  async login(dto: { email: string; password: string }, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      await this.eventService.emit('identity.user.login_failed', {
        id: crypto.randomUUID(), type: 'identity.user.login_failed',
        timestamp: new Date(), actorType: 'user', resourceType: 'user', resourceId: 'unknown',
        metadata: { email: dto.email, reason: 'user_not_found' }, ipAddress, userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.eventService.emit('identity.user.login_failed', {
        id: crypto.randomUUID(), type: 'identity.user.login_failed',
        timestamp: new Date(), actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id,
        metadata: { email: user.email, reason: 'invalid_password' }, ipAddress, userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const session = await this.createSession(user.id, ipAddress, userAgent);

    await this.eventService.emit('identity.user.logged_in', {
      id: crypto.randomUUID(), type: 'identity.user.logged_in',
      timestamp: new Date(), actorId: user.id, actorType: 'user',
      resourceType: 'user', resourceId: user.id, metadata: { email: user.email }, ipAddress, userAgent,
    });

    return this.buildAuthResponse(user, session);
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(0) },
    }).catch(() => {});

    await this.eventService.emit('identity.user.logged_out', {
      id: crypto.randomUUID(), type: 'identity.user.logged_out',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'session', resourceId: sessionId, metadata: {},
    });
  }

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

  async verifyMagicLink(dto: { token: string }, ipAddress?: string): Promise<AuthResponse> {
    const sessions = await this.prisma.session.findMany({
      where: { expiresAt: { gt: new Date() }, user: { email: dto.token } },
      orderBy: { createdAt: 'desc' }, take: 1,
    });
    if (!sessions.length) throw new UnauthorizedException('Invalid or expired token');

    const session = sessions[0];
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.session.delete({ where: { id: session.id } });
    const newSession = await this.createSession(user.id, ipAddress);
    return this.buildAuthResponse(user, newSession);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
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

    const newSession = await this.createSession(user.id, session.ipAddress ?? undefined, session.userAgent ?? undefined);

    await this.eventService.emit('identity.token.refreshed', {
      id: crypto.randomUUID(), type: 'identity.token.refreshed',
      timestamp: new Date(), actorId: user.id, actorType: 'user',
      resourceType: 'session', resourceId: newSession.id,
      metadata: { rotatedFrom: session.id },
    });

    return this.buildAuthResponse(user, newSession);
  }

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
  ) {
    const payload = { sub: user.id, email: user.email, role: user.role, type: 'access' as const };
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken: this.jwtService.sign(payload),
      refreshToken: session.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
