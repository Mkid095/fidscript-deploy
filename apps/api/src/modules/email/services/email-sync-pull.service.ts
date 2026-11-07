/**
 * Email sync pull — OnModuleInit / OnModuleDestroy lifecycle + tick loop.
 * Per-account poll work is delegated to EmailSyncPollService.
 */
import {
  Injectable, Logger, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { EmailSyncStateService } from './email-sync-state.service';
import { EmailSyncPollService } from './email-sync-poll.service';

const POLL_INTERVAL_MS = 8_000;

@Injectable()
export class EmailSyncPullService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailSyncPullService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  constructor(
    private state: EmailSyncStateService,
    private poll: EmailSyncPollService,
  ) {}

  onModuleInit() { this.startPolling(); }
  onModuleDestroy() { this.stopPolling(); }

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

  async pollAll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const accountIds = await this.state.findActiveAccountIds();
      for (const accountId of accountIds) {
        try {
          await this.poll.pollAccount(accountId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Poll failed for account ${accountId}: ${msg}`);
        }
      }
    } finally {
      this.polling = false;
    }
  }

  async pollAccount(accountId: string): Promise<void> {
    return this.poll.pollAccount(accountId);
  }
}
