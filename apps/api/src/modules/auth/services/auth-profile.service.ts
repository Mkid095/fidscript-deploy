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
      select: {
        id: true, email: true, name: true, avatarUrl: true, role: true,
        mfaEnabled: true, mustChangePassword: true, preferredAuthMethod: true,
        lastLoginAt: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    // ponytail: SDK auth.me() does `r.user`, so the API must wrap. Drift between
    // service-level getProfile() (returns User) and the HTTP contract ({ user: User })
    // is resolved at the controller boundary. AuthGuard and the dashboard both expect
    // the wrapped shape.
    return { user };
  }

  async updateProfile(userId: string, dto: { name?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, avatarUrl: dto.avatarUrl },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true },
    });

    await this.eventService.emit('identity.user.updated', null, dto);

    return user;
  }
}
