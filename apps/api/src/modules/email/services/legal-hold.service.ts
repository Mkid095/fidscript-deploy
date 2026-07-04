import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class LegalHoldService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  /**
   * Place a mailbox on legal hold — exempts all messages from retention policies.
   */
  async placeHold(mailboxId: string, reason: string, createdBy: string) {
    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { id: mailboxId },
      include: { domain: { select: { projectId: true } } },
    });
    if (!mailbox) throw new NotFoundException('Mailbox not found');

    // Idempotent — if already on hold, return existing
    const existing = await this.prisma.emailLegalHold.findFirst({
      where: { mailboxId, releasedAt: null },
    });
    if (existing) return existing;

    const hold = await this.prisma.emailLegalHold.create({
      data: { mailboxId, reason, createdBy },
    });

    await this.events.emit('email.legal_hold.placed', mailbox.domain.projectId, {
      mailboxId,
      holdId: hold.id,
      reason,
    }, {});

    return hold;
  }

  /**
   * Release a legal hold.
   */
  async releaseHold(holdId: string, releasedBy: string) {
    const hold = await this.prisma.emailLegalHold.findFirst({ where: { id: holdId, releasedAt: null } });
    if (!hold) throw new NotFoundException('Active legal hold not found');

    const updated = await this.prisma.emailLegalHold.update({
      where: { id: holdId },
      data: { releasedAt: new Date(), releasedBy },
    });

    const mailbox = await this.prisma.emailMailbox.findFirst({
      where: { id: hold.mailboxId },
      include: { domain: { select: { projectId: true } } },
    });

    await this.events.emit('email.legal_hold.released', mailbox?.domain.projectId ?? null, {
      mailboxId: hold.mailboxId,
      holdId: hold.id,
      releasedBy,
    }, {});

    return updated;
  }

  /**
   * List all active holds for a project.
   */
  async listHolds(projectId: string) {
    const mailboxes = await this.prisma.emailMailbox.findMany({
      where: { domain: { projectId } },
      select: { id: true },
    });
    const mbIds = mailboxes.map(m => m.id);
    if (!mbIds.length) return [];

    const holds = await this.prisma.emailLegalHold.findMany({
      where: { mailboxId: { in: mbIds }, releasedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // Hydrate mailbox info separately
    const mailboxIds = holds.map(h => h.mailboxId);
    const mailboxen = await this.prisma.emailMailbox.findMany({
      where: { id: { in: mailboxIds } },
      include: { domain: { select: { domain: true } } },
    });
    const mailboxMap = new Map(mailboxen.map(m => [m.id, m]));

    return holds.map(h => ({
      ...h,
      mailbox: mailboxMap.get(h.mailboxId),
    }));
  }
}
