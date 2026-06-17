import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { AuditService } from '../audit/audit.service';
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
const SESSION_DAYS = 7;

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventService: EventService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthResponse> {
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

    const session = await this.createSession(user.id, ipAddress);

    await this.eventService.emit('user.created', { userId: user.id, email: user.email });
    await this.auditService.log({
      userId: user.id,
      action: 'user.registered',
      ipAddress,
    });

    return this.buildAuthResponse(user, session);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await this.createSession(user.id, ipAddress, userAgent);

    await this.eventService.emit('user.login', { userId: user.id, email: user.email });
    await this.auditService.log({
      userId: user.id,
      action: 'user.login',
      ipAddress,
    });

    return this.buildAuthResponse(user, session);
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id: sessionId },
    }).catch(() => {});

    await this.eventService.emit('session.revoked', { sessionId, userId });
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

    await this.auditService.log({
      userId: user.id,
      action: 'magic_link.requested',
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

    await this.eventService.emit('user.updated', { userId: user.id });
    await this.auditService.log({
      userId,
      action: 'user.profile_updated',
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

    await this.prisma.session.delete({ where: { id: sessionId } });

    await this.eventService.emit('session.revoked', { sessionId, userId });
    await this.auditService.log({
      userId,
      action: 'session.revoked',
      metadata: { revokedSessionId: sessionId },
    });
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });

    await this.eventService.emit('session.revoked', { userId, all: true });
    await this.auditService.log({
      userId,
      action: 'sessions.revoked_all',
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

    await this.eventService.emit('api_key.created', { keyId: apiKey.id, userId });
    await this.auditService.log({
      userId,
      action: 'api_key.created',
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

    await this.eventService.emit('api_key.revoked', { keyId, userId });
    await this.auditService.log({
      userId,
      action: 'api_key.revoked',
      metadata: { revokedKeyId: keyId },
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

  private async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await this.eventService.emit('session.created', { sessionId: session.id, userId });

    return { id: session.id, token, expiresAt };
  }

  private buildAuthResponse(user: any, session: { id: string; token: string; expiresAt: Date }) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
      token: session.token,
    };
  }
}
