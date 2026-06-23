/**
 * Event listener for email attachment extraction.
 *
 * Subscribes to the `email.received` event emitted by EmailInboundService.
 * When Stalwart's Sieve script is enriched to include the JMAP message ID in
 * the sieve notify payload (future), this listener will trigger automatic
 * extraction of inbound attachments to the configured storage backend.
 *
 * Until then, `jmapMessageId` is undefined and extraction is skipped silently.
 * The per-message attachment download endpoint (`GET :local/messages/:id/attachments/:blobId`)
 * remains the primary way to retrieve attachment bytes for existing messages.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { AttachmentStorageService } from './attachment-storage.service';

@Injectable()
export class EmailAttachmentListener implements OnModuleInit {
  private readonly logger = new Logger(EmailAttachmentListener.name);

  constructor(
    private readonly eventService: EventService,
    private readonly storage: AttachmentStorageService,
  ) {}

  onModuleInit() {
    // EventService.on() uses EventEmitter2 (untyped). The emit() wraps the payload
    // in PlatformEvent.metadata, so the actual fields are at event.metadata.
    // Following the same pattern as DeploymentStateService.handleDeploymentCreated.
    this.eventService.on('email.received', async (event: any) => {
      // Guard: only extract if we have a JMAP message ID. The Sieve script
      // enrichment (not yet implemented) must be done in Stalwart to include
      // the JMAP Message-Id in the sieve notify payload.
      const payload = event?.metadata ?? {};
      if (!payload.jmapMessageId) {
        this.logger.debug(
          `email.received received without jmapMessageId — skipping attachment extraction for ${payload.messageId}. ` +
          `This is expected until Stalwart's Sieve script is updated.`,
        );
        return;
      }

      this.logger.log(
        `email.received: extracting attachments for ${payload.mailboxLocal}/${payload.jmapMessageId}`,
      );

      try {
        const result = await this.storage.extractInboundAttachments(
          payload.mailboxLocal,
          payload.jmapMessageId,
          payload.projectId,
        );
        if (result.stored > 0 || result.skipped > 0) {
          this.logger.log(
            `Attachment extraction complete for ${payload.messageId}: stored=${result.stored}, skipped=${result.skipped}`,
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Attachment extraction failed for ${payload.messageId}: ${msg}`);
      }
    });
  }
}