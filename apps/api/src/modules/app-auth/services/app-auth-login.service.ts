import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AppAuthLoginService {
  constructor(private prisma: PrismaService, private eventService: EventService) {}

  async login(projectId: string, dto: any) {
    const user = await this.prisma.appUser.findFirst({ where: { projectId, email: dto.email } });

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

    await this.prisma.appSession.create({ data: { userId: user.id, tokenHash, expiresAt } });
    await this.eventService.emit('auth.login_succeeded', { userId: user.id, projectId, email: user.email });

    return { user: this.formatUser(user), token, expiresAt };
  }

  async magicLink(projectId: string, dto: any) {
    const user = await this.prisma.appUser.findFirst({ where: { projectId, email: dto.email } });
    if (!user) return { sent: true };

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.appUser.update({ where: { id: user.id }, data: { verificationToken: token } });
    return { sent: true };
  }

  async verifyMagicLink(projectId: string, dto: any) {
    const user = await this.prisma.appUser.findFirst({ where: { projectId, verificationToken: dto.token } });
    if (!user) throw new UnauthorizedException('Invalid token');

    await this.prisma.appUser.update({ where: { id: user.id }, data: { verificationToken: null, emailVerified: true } });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.appSession.create({ data: { userId: user.id, tokenHash, expiresAt } });
    await this.eventService.emit('auth.login_succeeded', { userId: user.id, projectId, email: user.email });

    return { user: this.formatUser(user), token, expiresAt };
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
