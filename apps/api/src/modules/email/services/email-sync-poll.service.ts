/**
 * Email sync poll — single-account JMAP poll cycle.
 *
 * Encapsulates the per-account poll (state seed → queryChanges → Email/get
 * → process → commit) so EmailSyncPullService can stay focused on the
 * tick loop.
 */
import { Injectable, Logger } from '@nestjs/common';
import { StalwartJmapService } from '@/modules/email/stalwart/stalwart-core.service';
import { EmailSyncStateService } from './email-sync-state.service';
import { EmailSyncEmailMapperService, EmailRow } from './email-sync-email-mapper.service';
import { EmailSyncMessageStoreService } from './email-sync-message-store.service';
import { EmailSyncBroadcastService } from './email-sync-broadcast.service';

const BATCH_SIZE = 100;

@Injectable()
export class EmailSyncPollService {
  private readonly logger = new Logger(EmailSyncPollService.name);

  constructor(
    private stalwart: StalwartJmapService,
    private state: EmailSyncStateService,
    private broadcast: EmailSyncBroadcastService,
    private mapper: EmailSyncEmailMapperService,
    private messageStore: EmailSyncMessageStoreService,
  ) {}

  /** Run a single poll cycle for one Stalwart account. */
  async pollAccount(accountId: string): Promise<void> {
    const existingCursor = await this.state.getCursor(accountId);
    if (!existingCursor) {
      await this.state.seedCursor(accountId);
      this.logger.debug(`Skipping initial poll for ${accountId} — cursor seeded`);
      return;
    }

    const changesResult = await this.fetchChanges(accountId, existingCursor.lastState);
    if (!changesResult) {
      this.logger.warn(`Email/queryChanges returned no result for account ${accountId}`);
      return;
    }

    const { newState, createdIds, updatedIds } = changesResult;
    const allChangedIds = [...createdIds, ...updatedIds];
    if (allChangedIds.length === 0) {
      await this.state.recordEmptyPoll(accountId);
      return;
    }

    this.logger.debug(`Account ${accountId}: ${createdIds.length} new, ${updatedIds.length} updated`);

    const emails = await this.fetchEmails(accountId, allChangedIds);
    if (emails) {
      await this.processEmails(accountId, emails, createdIds);
    }
    await this.state.commitState(accountId, newState);
    this.logger.log(`Account ${accountId}: synced ${allChangedIds.length} emails → state=${newState}`);
  }

  private async fetchChanges(accountId: string, sinceState: string): Promise<{
    newState: string; createdIds: string[]; updatedIds: string[];
  } | null> {
    const changesResp = await this.stalwart.jmapCall([
      ['Email/queryChanges', { accountId, sinceState, maxChanges: BATCH_SIZE, fetchRecords: false }, '0'],
    ]);
    return changesResp.methodResponses[0]?.[1] as {
      newState: string; createdIds: string[]; updatedIds: string[];
    } | null;
  }

  private async fetchEmails(accountId: string, ids: string[]): Promise<EmailRow[] | null> {
    const resp = await this.stalwart.jmapCall([
      ['Email/get', {
        accountId, ids,
        properties: [
          'from', 'to', 'cc', 'bcc', 'subject', 'preview', 'bodyValues',
          'textBody', 'htmlBody', 'attachments', 'headers', 'keywords',
          'size', 'receivedAt', 'mailboxIds', 'messageId',
        ],
      }, '1'],
    ]);
    const result = resp.methodResponses[0]?.[1] as { list: Array<Record<string, unknown>> } | null;
    return result?.list ? (result.list as EmailRow[]) : null;
  }

  private async processEmails(accountId: string, emails: EmailRow[], createdIds: string[]): Promise<void> {
    for (const email of emails) {
      try {
        await this.processEmail(accountId, email, createdIds.includes(email.id ?? ''));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to process email ${email.id}: ${msg}`);
      }
    }
  }

  private async processEmail(accountId: string, email: EmailRow, isNew: boolean): Promise<void> {
    const mapped = this.mapper.mapEmailRow(email);
    if (!mapped) {
      this.logger.warn(`Skipping email with no JMAP blob ID — subject=${(email.subject as string) ?? ''}`);
      return;
    }
    const mailbox = await this.mapper.resolveMailbox(accountId, email);
    if (!mailbox) {
      this.logger.debug(`Skipping email ${mapped.jmapMessageId} — no platform domain for account ${accountId}`);
      return;
    }
    const upserted = await this.messageStore.upsertMessage({
      blobId: mapped.blobId, mapped, mailboxId: mailbox.id, projectId: mailbox.projectId,
    });
    await this.broadcast.broadcastReceived(
      mailbox.projectId, mailbox.localPart, mailbox.id, isNew, {
        messageId: upserted.id, jmapMessageId: mapped.jmapMessageId,
        from: mapped.from, to: mapped.to, subject: mapped.subject,
        isRead: mapped.isRead, isStarred: mapped.isStarred, isDraft: mapped.isDraft,
        receivedAt: mapped.receivedAt, preview: upserted.preview,
      },
    );
  }
}
