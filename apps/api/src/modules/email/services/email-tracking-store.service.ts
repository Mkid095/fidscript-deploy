/**
 * Email tracking store — DB operations for `emailTrackingEvent` and
 * message-status side effects (OPENED / CLICKED transitions).
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class EmailTrackingStoreService {
  constructor(private prisma: PrismaService) {}

  /** Find a message's projectId + current status (for guard + event emit). */
  async findMessageStatus(messageId: string): Promise<{ projectId: string; status: string } | null> {
    return this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      select: { projectId: true, status: true },
    });
  }

  /** Insert a tracking event row (idempotency is best-effort — no unique constraint). */
  async recordEvent(
    messageId: string,
    projectId: string,
    type: 'open' | 'click',
    extra: { url?: string; userAgent?: string; ipAddress?: string },
  ): Promise<void> {
    await this.prisma.emailTrackingEvent.create({
      data: {
        messageId,
        projectId,
        type,
        url: extra.url,
        userAgent: extra.userAgent,
        ipAddress: extra.ipAddress,
      },
    });
  }

  /**
   * Update message status to OPENED, but only if not past a terminal state.
   * Returns silently if the row no longer exists.
   */
  async markOpenedIfNotTerminal(messageId: string): Promise<void> {
    const message = await this.findMessageStatus(messageId);
    if (!message) return;
    const terminalStates = ['OPENED', 'CLICKED', 'BOUNCED', 'DEAD', 'FAILED'];
    if (terminalStates.includes(message.status)) return;
    await this.prisma.emailMessage.update({
      where: { id: messageId },
      data: { status: 'OPENED' },
    }).catch(() => {});
  }

  /** Update message status to CLICKED. */
  async markClicked(messageId: string): Promise<void> {
    await this.prisma.emailMessage.update({
      where: { id: messageId },
      data: { status: 'CLICKED' },
    }).catch(() => {});
  }

  /** Fetch all events for a message (used for the per-message stats view). */
  async listEvents(messageId: string) {
    return this.prisma.emailTrackingEvent.findMany({
      where: { messageId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
