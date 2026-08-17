/**
 * Email sync state tracking — encapsulates the per-account cursor
 * (`emailSyncCursor`) and provides typed read/write operations.
 *
 * State-based (not sequence-number) — resilient to missed polls. The
 * cursor is updated ONLY after the poll cycle successfully processes
 * (so a crash between fetching changes and updating state will
 * re-deliver on next poll; this is safe because Email/queryChanges
 * is read-only and idempotent).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface SyncCursor {
  accountId: string;
  lastState: string;
  lastPolledAt: Date;
}

@Injectable()
export class EmailSyncStateService {
  private readonly logger = new Logger(EmailSyncStateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get the current cursor for a Stalwart accountId. Returns null if
   * no cursor has been seeded yet.
   */
  async getCursor(accountId: string): Promise<SyncCursor | null> {
    return this.prisma.emailSyncCursor.findUnique({ where: { accountId } });
  }

  /**
   * Seed a fresh cursor for a previously-unseen account. Used on first
   * poll to skip the "Email/queryChanges since state 0" thundering herd.
   */
  async seedCursor(accountId: string): Promise<void> {
    await this.prisma.emailSyncCursor.create({
      data: { accountId, lastState: '' },
    });
    this.logger.debug(`Seeded sync cursor for new account ${accountId}`);
  }

  /**
   * Persist the new state after a successful poll. Should only be called
   * AFTER all email rows for the cycle have been processed.
   */
  async commitState(accountId: string, newState: string): Promise<void> {
    await this.prisma.emailSyncCursor.update({
      where: { accountId },
      data: { lastState: newState, lastPolledAt: new Date() },
    });
  }

  /**
   * Bump the lastPolledAt timestamp when no new mail is detected.
   */
  async recordEmptyPoll(accountId: string): Promise<void> {
    await this.prisma.emailSyncCursor.update({
      where: { accountId },
      data: { lastPolledAt: new Date() },
    });
  }

  /**
   * Find every distinct Stalwart accountId that has at least one active
   * mailbox — these are the accounts we poll.
   */
  async findActiveAccountIds(): Promise<string[]> {
    const rows = await this.prisma.emailMailbox.findMany({
      where: { isActive: true },
      select: { stalwartAccountId: true },
      distinct: ['stalwartAccountId'],
    });
    return rows.map((r) => r.stalwartAccountId).filter((id): id is string => !!id);
  }
}
