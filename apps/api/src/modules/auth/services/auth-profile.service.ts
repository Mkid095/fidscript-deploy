import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthProfileService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, mfaEnabled: true, mustChangePassword: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: { name?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, avatarUrl: dto.avatarUrl },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true },
    });

    await this.eventService.emit('identity.user.updated', {
      id: crypto.randomUUID(), type: 'identity.user.updated',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'user', resourceId: user.id, metadata: dto,
    });

    return user;
  }
}
