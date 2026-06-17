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

    await this.eventService.emit('identity.user.logged_in', {
      id: crypto.randomUUID(), type: 'identity.user.logged_in',
      timestamp: new Date(), actorId: user.id, actorType: 'user',
      resourceType: 'user', resourceId: user.id, metadata: { email: user.email }, ipAddress, userAgent,
    });

    return user;
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
}
