import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AppAuthTokenService } from './app-auth-token.service';

@Injectable()
export class AppAuthLoginService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async login(
    projectId: string,
    dto: any,
    tokenService: AppAuthTokenService,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });

    if (!user || !user.passwordHash) {
      await this.eventService.emit('auth.login_failed', projectId, {
        email: dto.email,
      }, { ipAddress, userAgent });
      throw new UnauthorizedException('Invalid credentials');
    }

    const { compare } = await import('bcrypt');
    const valid = await compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.eventService.emit('auth.login_failed', projectId, {
        email: dto.email,
      }, { ipAddress, userAgent });
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await tokenService.issueTokens(
      user.id, projectId, user.email, ipAddress, userAgent,
    );
    await this.eventService.emit('auth.login_succeeded', projectId, {
      userId: user.id, email: user.email,
    }, { actorId: user.id, ipAddress, userAgent });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      user: { id: user.id, projectId: user.projectId, email: user.email, name: user.name },
    };
  }

  async magicLink(projectId: string, dto: any) {
    // Legacy — magic link is a stub (magic-code replaced it).
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });
    if (!user) return { sent: true };
    return { sent: true };
  }

  async verifyMagicLink(projectId: string, dto: any, tokenService: AppAuthTokenService, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.appUser.findFirst({
      where: { projectId, verificationToken: dto.token },
    });
    if (!user) throw new UnauthorizedException('Invalid token');

    await this.prisma.appUser.update({
      where: { id: user.id },
      data: { verificationToken: null, emailVerified: true },
    });

    const tokens = await tokenService.issueTokens(
      user.id, projectId, user.email, ipAddress, userAgent,
    );
    await this.eventService.emit('auth.login_succeeded', projectId, {
      userId: user.id, email: user.email,
    }, { actorId: user.id, ipAddress, userAgent });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      user: { id: user.id, projectId: user.projectId, email: user.email, name: user.name },
    };
  }
}