import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthSessionMgmtService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async getSessions(userId: string) {
    // Only the live ones. A revoked session has `expiresAt` set to the epoch,
    // so it used to be listed as if it were still open.
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true, ipAddress: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.session.update({ where: { id: sessionId }, data: { expiresAt: new Date(0) } });

    await this.eventService.emit('identity.session.revoked', null, { sessionId });
  }

  async revokeAllSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({ where: { userId }, select: { id: true } });
    await this.prisma.session.updateMany({ where: { userId }, data: { expiresAt: new Date(0) } });

    await this.eventService.emit('identity.session.revoked', null, {
      all: true,
      sessionCount: sessions.length,
    });
  }
}
