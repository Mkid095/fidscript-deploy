import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthLoginService {
  constructor(private prisma: PrismaService, private eventService: EventService) {}

  async login(dto: { email: string; password: string }, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      await this.eventService.emit(
        'identity.user.login_failed',
        { email: dto.email, reason: 'user_not_found' },
        { actorType: 'user', resourceType: 'user', resourceId: 'unknown', ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.eventService.emit(
        'identity.user.login_failed',
        { email: user.email, reason: 'invalid_password' },
        { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await this.eventService.emit(
      'identity.user.logged_in',
      { email: user.email },
      { actorId: user.id, actorType: 'user', resourceType: 'user', resourceId: user.id, ipAddress, userAgent },
    );

    return user;
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(0) },
    }).catch(() => {});

    await this.eventService.emit(
      'identity.user.logged_out',
      {},
      { actorId: userId, actorType: 'user', resourceType: 'session', resourceId: sessionId },
    );
  }
}
