import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  RegisterDto,
  LoginDto,
  MagicLinkDto,
  VerifyMagicLinkDto,
  CreateApiKeyDto,
  UpdateProfileDto,
} from './dto/index';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_DAYS = 7;

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  sessionId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    });

    const session = await this.createSession(user.id, ipAddress, userAgent);

    await this.eventService.emit('identity.user.registered', {
      id: crypto.randomUUID(),
      type: 'identity.user.registered',
      timestamp: new Date(),
      actorId: user.id,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { email: user.email, name: user.name },
      ipAddress,
      userAgent,
    });

    return this.buildAuthResponse(user, session);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      await this.eventService.emit('identity.user.login_failed', {
        id: crypto.randomUUID(),
        type: 'identity.user.login_failed',
        timestamp: new Date(),
        actorType: 'user',
        resourceType: 'user',
        resourceId: 'unknown',
        metadata: { email: dto.email, reason: 'user_not_found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.eventService.emit('identity.user.login_failed', {
        id: crypto.randomUUID(),
        type: 'identity.user.login_failed',
        timestamp: new Date(),
        actorId: user.id,
        actorType: 'user',
        resourceType: 'user',
        resourceId: user.id,
        metadata: { email: user.email, reason: 'invalid_password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await this.createSession(user.id, ipAddress, userAgent);

    await this.eventService.emit('identity.user.logged_in', {
      id: crypto.randomUUID(),
      type: 'identity.user.logged_in',
      timestamp: new Date(),
      actorId: user.id,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { email: user.email },
      ipAddress,
      userAgent,
    });

    return this.buildAuthResponse(user, session);
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (session) {
      // Invalidate the refresh token family by marking session as revoked
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(0) },
      }).catch(() => {});
    }

    await this.eventService.emit('identity.user.logged_out', {
      id: crypto.randomUUID(),
      type: 'identity.user.logged_out',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'session',
      resourceId: sessionId,
      metadata: {},
    });
  }

  async magicLink(dto: MagicLinkDto): Promise<{ sent: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { sent: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(token, BCRYPT_ROUNDS),
        expiresAt,
      },
    });

    return { sent: true };
  }

  async verifyMagicLink(dto: VerifyMagicLinkDto, ipAddress?: string): Promise<AuthResponse> {
    const sessions = await this.prisma.session.findMany({
      where: {
        expiresAt: { gt: new Date() },
        user: { email: dto.token },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (sessions.length === 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const session = sessions[0];
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.session.delete({ where: { id: session.id } });

    const newSession = await this.createSession(user.id, ipAddress);

    return this.buildAuthResponse(user, newSession);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
      },
    });

    await this.eventService.emit('identity.user.updated', {
      id: crypto.randomUUID(),
      type: 'identity.user.updated',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      metadata: dto,
    });

    return user;
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(0) },
    });

    await this.eventService.emit('identity.session.revoked', {
      id: crypto.randomUUID(),
      type: 'identity.session.revoked',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'session',
      resourceId: sessionId,
      metadata: { all: false },
    });
  }

  async revokeAllSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });

    await this.prisma.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date(0) },
    });

    await this.eventService.emit('identity.session.revoked', {
      id: crypto.randomUUID(),
      type: 'identity.session.revoked',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'session',
      resourceId: userId,
      metadata: { all: true, sessionCount: sessions.length },
    });
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    const key = `fsk_${crypto.randomBytes(24).toString('base64url')}`;
    const keyHash = await bcrypt.hash(key, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        keyHash,
        permissions: dto.permissions || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.eventService.emit('identity.api_key.created', {
      id: crypto.randomUUID(),
      type: 'identity.api_key.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      metadata: { name: dto.name },
    });

    return { apiKey, key };
  }

  async getApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(userId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id: keyId } });

    await this.eventService.emit('identity.api_key.revoked', {
      id: crypto.randomUUID(),
      type: 'identity.api_key.revoked',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'api_key',
      resourceId: keyId,
      metadata: { name: apiKey.name },
    });
  }

  async validateApiKey(key: string): Promise<{ userId: string; permissions: string[] } | null> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
    });

    for (const apiKey of apiKeys) {
      if (await bcrypt.compare(key, apiKey.keyHash)) {
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });
        return { userId: apiKey.userId, permissions: apiKey.permissions as string[] };
      }
    }

    return null;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Find session — it must not be expired (we set expiresAt to epoch on revocation)
    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session revoked or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate: revoke old session, create new one
    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(0) },
    });

    const newSession = await this.createSession(user.id, session.ipAddress ?? undefined, session.userAgent ?? undefined);

    await this.eventService.emit('identity.token.refreshed', {
      id: crypto.randomUUID(),
      type: 'identity.token.refreshed',
      timestamp: new Date(),
      actorId: user.id,
      actorType: 'user',
      resourceType: 'session',
      resourceId: newSession.id,
      metadata: { rotatedFrom: session.id },
    });

    return this.buildAuthResponse(user, newSession);
  }

  private async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await this.eventService.emit('identity.session.created', {
      id: crypto.randomUUID(),
      type: 'identity.session.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'session',
      resourceId: session.id,
      metadata: {},
      ipAddress,
      userAgent,
    });

    return { id: session.id, refreshToken, expiresAt };
  }

  private buildAuthResponse(user: { id: string; email: string; name: string | null; role: string }, session: { id: string; refreshToken: string; expiresAt: Date }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, type: 'access' };
    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken: session.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
