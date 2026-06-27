/**
 * JMAP state-based email sync service.
 *
 * Polls Stalwart's Email/queryChanges every POLL_INTERVAL_MS for every active
 * mailbox account, then emits `email.received` events and broadcasts to the
 * project's realtime room so connected dashboard clients get live inbox updates.
 *
 * Key design decisions:
 * - State-based (not sequence-number) — resilient to missed polls.
 * - One sync cursor per Stalwart accountId, not per mailbox.
 *   All mailboxes under an account share the same JMAP state machine.
 * - Updates cursor ONLY after successfully processing a poll cycle so a crash
 *   between fetching changes and updating state will re-deliver on next poll
 *   (idempotent at the JMAP level — Email/queryChanges is read-only).
 * - Does NOT create EmailMessage rows when the platform domain is not
 *   registered — those emails are unreachable by the platform and the cursor
 *   still advances to avoid re-polling the same missing messages forever.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailStatus } from '@prisma/client';
import { EventService } from '@/modules/events/event.service';
import { StalwartJmapService } from '@/modules/email/stalwart/stalwart-core.service';
import { RealtimeGateway } from '@/modules/realtime/gateways/realtime.gateway';

const POLL_INTERVAL_MS = 8_000; // 8 seconds — balances freshness vs. Stalwart load
const BATCH_SIZE = 100; // Email/queryChanges maxChanges per call

@Injectable()
export class EmailSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailSyncService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  constructor(
    private prisma: PrismaService,
    private events: EventService,
    private stalwart: StalwartJmapService,
    private realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    this.logger.log(`Starting JMAP email sync — polling every ${POLL_INTERVAL_MS}ms`);
    this.timer = setInterval(() => this.pollAll(), POLL_INTERVAL_MS);
  }

  private stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('JMAP email sync stopped');
    }
  }

  /**
   * Full sync loop: find every active mailbox with a Stalwart accountId and
   * poll it. Runs on every tick — errors are isolated per-account so one
   * failing domain doesn't halt the whole loop.
   */
  async pollAll(): Promise<void> {
    if (this.polling) return; // skip overlapping cycles
    this.polling = true;
    try {
      // Find every distinct Stalwart accountId that has active mailboxes
      const accounts = await this.prisma.emailMailbox.findMany({
        where: { isActive: true },
        select: { stalwartAccountId: true },
        distinct: ['stalwartAccountId'],
      });

      for (const { stalwartAccountId } of accounts) {
        if (!stalwartAccountId) continue;
        try {
          await this.pollAccount(stalwartAccountId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Poll failed for account ${stalwartAccountId}: ${msg}`);
        }
      }
    } finally {
      this.polling = false;
    }
  }

  /**
   * Poll one Stalwart accountId using state-based Email/queryChanges.
   *
   * 1. Get or create the sync cursor for this accountId.
   * 2. Call Email/queryChanges since lastState.
   * 3. For every new or updated emailId, fetch full details and emit events.
   * 4. Persist the new state to the cursor.
   */
  async pollAccount(accountId: string): Promise<void> {
    // Check if cursor already exists — if not, this is the first poll for this
    // account and we skip to avoid querying JMAP state "0" (thundering herd on startup).
    const existingCursor = await this.prisma.emailSyncCursor.findUnique({
      where: { accountId },
    });
    if (!existingCursor) {
      // First time seeing this account — seed the cursor but skip this cycle.
      await this.prisma.emailSyncCursor.create({
        data: { accountId, lastState: '' },
      });
      this.logger.debug(`Skipping initial poll for ${accountId} — cursor seeded`);
      return;
    }

    // Step 1: query for changes since persisted state
    const sinceState = existingCursor.lastState;
    const changesResp = await this.stalwart.jmapCall([
      [
        'Email/queryChanges',
        {
          accountId,
          sinceState,
          maxChanges: BATCH_SIZE,
          fetchRecords: false,
        },
        '0',
      ],
    ]);

    const changesResult = changesResp.methodResponses[0]?.[1] as {
      hasMoreChanges: boolean;
      newState: string;
      createdIds: string[];
      updatedIds: string[];
    } | null;

    if (!changesResult) {
      this.logger.warn(`Email/queryChanges returned no result for account ${accountId}`);
      return;
    }

    const { newState, createdIds = [], updatedIds = [] } = changesResult;
    const allChangedIds = [...createdIds, ...updatedIds];

    if (allChangedIds.length === 0) {
      // No new mail — just update poll timestamp
      await this.prisma.emailSyncCursor.update({
        where: { accountId },
        data: { lastPolledAt: new Date() },
      });
      return;
    }

    this.logger.debug(
      `Account ${accountId}: ${createdIds.length} new, ${updatedIds.length} updated — fetching full emails`,
    );

    // Step 2: fetch full email details for changed IDs
    const emailsResp = await this.stalwart.jmapCall([
      [
        'Email/get',
        {
          accountId,
          ids: allChangedIds,
          properties: [
            'from',
            'to',
            'cc',
            'bcc',
            'subject',
            'preview',
            'bodyValues',
            'textBody',
            'htmlBody',
            'attachments',
            'headers',
            'keywords',
            'size',
            'receivedAt',
            'mailboxIds',
            'messageId',
          ],
        },
        '1',
      ],
    ]);

    const emailsResult = emailsResp.methodResponses[0]?.[1] as {
      list: Array<Record<string, unknown>>;
    } | null;

    if (emailsResult?.list) {
      await this.processEmails(accountId, emailsResult.list as EmailRow[], createdIds);
    }

    // Step 3: persist new state — only after successful processing
    await this.prisma.emailSyncCursor.update({
      where: { accountId },
      data: { lastState: newState, lastPolledAt: new Date() },
    });

    this.logger.log(
      `Account ${accountId}: synced ${allChangedIds.length} emails → state=${newState}`,
    );
  }

  /**
   * Process a batch of email rows: emit events and broadcast to realtime.
   */
  private async processEmails(
    accountId: string,
    emails: EmailRow[],
    createdIds: string[],
  ): Promise<void> {
    for (const email of emails) {
      try {
        await this.processEmail(accountId, email, createdIds.includes(email.id ?? ''));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process email ${email.id}: ${msg}`);
      }
    }
  }

  /**
   * Process a single email:
   * 1. Resolve projectId from the destination mailbox's domain.
   * 2. Upsert an EmailMessage row (idempotent — updatedIds may re-touch).
   * 3. Emit email.received (drives webhooks, audit, NATS).
   * 4. Broadcast to the project's realtime room.
   */
  private async processEmail(
    accountId: string,
    email: EmailRow,
    isNew: boolean,
  ): Promise<void> {
    const jmapMessageId: string = (email.messageId as string) ?? email.id ?? '';

    // Resolve to / from
    const rawFrom = Array.isArray(email.from) ? email.from[0] : email.from;
    const rawTo = Array.isArray(email.to) ? email.to[0] : email.to;
    const from: string = typeof rawFrom === 'string' ? rawFrom : (rawFrom as Record<string, string>)?.email ?? '';
    const to: string = typeof rawTo === 'string' ? rawTo : (rawTo as Record<string, string>)?.email ?? '';

    // Extract text body from bodyValues (JMAP uses bodyValues for MIME body parts)
    let textBody = '';
    let htmlBody = '';
    const bodyValues = email.bodyValues as Record<string, { value: string; type: string }> | undefined;
    if (bodyValues) {
      for (const part of Object.values(bodyValues)) {
        if (part.type === 'text/plain') textBody = part.value;
        else if (part.type === 'text/html') htmlBody = part.value;
      }
    }
    if (!textBody && typeof email.textBody === 'string') textBody = email.textBody;
    if (!htmlBody && typeof email.htmlBody === 'string') htmlBody = email.htmlBody;

    const subject: string = (email.subject as string) ?? '';
    const sizeBytes: number = typeof email.size === 'number' ? email.size : 0;
    const receivedAt: string = (email.receivedAt as string) ?? new Date().toISOString();
    const keywords: Record<string, boolean> = (email.keywords as Record<string, boolean>) ?? {};
    const isDraft = keywords['$draft'] ?? false;
    const isRead = keywords['$seen'] ?? false;
    const isStarred = keywords['$flagged'] ?? false;

    // Look up which mailbox received this — use the first mailboxId from the email
    const mailboxIds: string[] = Array.isArray(email.mailboxIds)
      ? (email.mailboxIds as string[])
      : Object.keys(email.mailboxIds as Record<string, boolean>);

    let projectId: string | null = null;
    let mailboxRecord: { id: string; localPart: string; domainId: string } | null = null;

    // Try to find the mailbox in our DB by matching the accountId and localPart
    for (const mboxId of mailboxIds) {
      const mbox = await this.prisma.emailMailbox.findFirst({
        where: { stalwartAccountId: accountId, id: mboxId },
        include: { domain: true },
      });
      if (mbox) {
        mailboxRecord = mbox;
        projectId = mbox.domain.projectId;
        break;
      }
    }

    // Fallback: try a broader lookup by accountId only
    if (!mailboxRecord) {
      const mbox = await this.prisma.emailMailbox.findFirst({
        where: { stalwartAccountId: accountId },
        include: { domain: true },
      });
      if (mbox) {
        mailboxRecord = mbox;
        projectId = mbox.domain.projectId;
      }
    }

    // If we still don't have a projectId, this domain isn't registered in our platform.
    // Advance the cursor silently — the email is in Stalwart but unreachable by us.
    if (!projectId) {
      this.logger.debug(
        `Skipping email ${jmapMessageId} — no platform domain found for account ${accountId}`,
      );
      return;
    }

    // Upsert EmailMessage row keyed on JMAP blob ID (email.id).
    // jmapMessageId stores the RFC Message-Id header for correlation with SMTP logs.
    const blobId: string = email.id ?? '';
    if (!blobId) {
      this.logger.warn(`Skipping email with no JMAP blob ID — subject=${subject}`);
      return;
    }

    const messageData = {
      mailboxId: mailboxRecord!.id,
      projectId,
      from,
      to,
      subject,
      textBody: textBody.slice(0, 100_000), // cap at 100k chars
      htmlBody: htmlBody.slice(0, 200_000), // cap at 200k chars
      sizeBytes: BigInt(sizeBytes),
      isRead,
      isStarred,
      isDraft,
      jmapMessageId: jmapMessageId || null,
      receivedAt: new Date(receivedAt),
      status: EmailStatus.RECEIVED,
    };

    const emailMessage = await this.prisma.emailMessage.upsert({
      where: { id: blobId },
      create: { id: blobId, ...messageData },
      update: {
        from,
        to,
        subject,
        textBody: textBody.slice(0, 100_000),
        htmlBody: htmlBody.slice(0, 200_000),
        sizeBytes: BigInt(sizeBytes),
        isRead,
        isStarred,
        isDraft,
        jmapMessageId: jmapMessageId || null,
      },
    });

    // Emit platform event — drives webhooks, audit, NATS consumers
    this.events.emit('email.received', {
      messageId: emailMessage.id,
      jmapMessageId,
      projectId,
      mailboxId: mailboxRecord!.id,
      mailboxLocal: mailboxRecord!.localPart,
      from,
      to,
      subject,
      isNew,
    });

    // Broadcast to project's realtime room so dashboard updates live
    this.realtime.broadcastToProject(projectId, 'email.received', {
      messageId: emailMessage.id,
      jmapMessageId,
      from,
      to,
      subject,
      preview: textBody.slice(0, 200),
      isRead,
      isStarred,
      isDraft,
      receivedAt,
    });
  }
}

/** Extracted email row shape from Email/get */
interface EmailRow {
  id?: string;
  messageId?: string;
  from?: unknown;
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject?: unknown;
  preview?: unknown;
  bodyValues?: unknown;
  textBody?: unknown;
  htmlBody?: unknown;
  attachments?: unknown;
  headers?: unknown;
  keywords?: unknown;
  size?: unknown;
  receivedAt?: unknown;
  mailboxIds?: unknown;
}
