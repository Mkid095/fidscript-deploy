import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventService } from '../../events/event.service.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  RegisterAppUserDto,
  LoginAppUserDto,
  MagicLinkDto,
  VerifyMagicLinkDto,
  CreateRoleDto,
  AssignRoleDto,
} from './dto/index.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AppAuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  async register(projectId: string, dto: RegisterAppUserDto) {
    const existing = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });
    if (existing) throw new ConflictException('User already exists');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.appUser.create({
      data: {
        projectId,
        email: dto.email,
        passwordHash,
        name: dto.name,
        verificationToken: crypto.randomBytes(32).toString('hex'),
      },
    });

    await this.eventService.emit('auth.user_created', {
      userId: user.id,
      projectId,
      email: user.email,
    });

    return this.formatUser(user);
  }

  async login(projectId: string, dto: LoginAppUserDto) {
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });

    if (!user || !user.passwordHash) {
      await this.eventService.emit('auth.login_failed', { projectId, email: dto.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.eventService.emit('auth.login_failed', { projectId, email: dto.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.appSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.eventService.emit('auth.login_succeeded', {
      userId: user.id,
      projectId,
      email: user.email,
    });

    return {
      user: this.formatUser(user),
      token,
      expiresAt,
    };
  }

  async magicLink(projectId: string, dto: MagicLinkDto) {
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });

    if (!user) return { sent: true };

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.appUser.update({
      where: { id: user.id },
      data: { verificationToken: token },
    });

    return { sent: true };
  }

  async verifyMagicLink(projectId: string, dto: VerifyMagicLinkDto) {
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, verificationToken: dto.token },
    });

    if (!user) throw new UnauthorizedException('Invalid token');

    await this.prisma.appUser.update({
      where: { id: user.id },
      data: { verificationToken: null, emailVerified: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.appSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.eventService.emit('auth.login_succeeded', {
      userId: user.id,
      projectId,
      email: user.email,
    });

    return {
      user: this.formatUser(user),
      token,
      expiresAt,
    };
  }

  async createRole(projectId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.appRole.findFirst({
      where: { projectId, name: dto.name },
    });
    if (existing) throw new ConflictException('Role already exists');

    const role = await this.prisma.appRole.create({
      data: {
        projectId,
        name: dto.name,
        permissions: dto.permissions || [],
      },
    });

    return role;
  }

  async listRoles(projectId: string) {
    return this.prisma.appRole.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async assignRole(projectId: string, dto: AssignRoleDto) {
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.appRole.findFirst({
      where: { projectId, name: dto.roleName },
    });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.appUserRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });

    return { userId: user.id, roleId: role.id, roleName: role.name };
  }

  async getUserRoles(userId: string) {
    const roles = await this.prisma.appUserRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return roles.map(r => r.role);
  }

  async validateToken(token: string) {
    const sessions = await this.prisma.appSession.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    for (const session of sessions) {
      if (await bcrypt.compare(token, session.tokenHash)) {
        const user = await this.prisma.appUser.findUnique({
          where: { id: session.userId },
          include: { roles: { include: { role: true } } },
        });
        if (user) {
          return {
            userId: user.id,
            projectId: user.projectId,
            email: user.email,
            permissions: user.roles.flatMap(r => r.role.permissions as string[]),
          };
        }
      }
    }

    return null;
  }

  async logout(sessionId: string) {
    await this.prisma.appSession.delete({ where: { id: sessionId } }).catch(() => {});
    return { success: true };
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      projectId: user.projectId,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
