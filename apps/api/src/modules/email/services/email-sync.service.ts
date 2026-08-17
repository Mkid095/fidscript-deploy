/**
 * Email sync — facade.
 *
 * Split into:
 *   - EmailSyncStateService — cursor read/write
 *   - EmailSyncBroadcastService — event + realtime emit
 *   - EmailSyncPullService — the polling loop + email row processing
 *
 * This facade re-exports the polling entry points so existing consumers
 * (`EmailModule` provider list, `EmailMessageService`, the queue listener,
 * tests) keep their import path.
 */
import { Injectable } from '@nestjs/common';
import { EmailSyncPullService } from './email-sync-pull.service';

@Injectable()
export class EmailSyncService {
  constructor(private readonly pull: EmailSyncPullService) {}

  /** Run one full poll cycle (skips if one is already in-flight). */
  pollAll(): Promise<void> {
    return this.pull.pollAll();
  }

  /** Poll a single Stalwart accountId. */
  pollAccount(accountId: string): Promise<void> {
    return this.pull.pollAccount(accountId);
  }
}
