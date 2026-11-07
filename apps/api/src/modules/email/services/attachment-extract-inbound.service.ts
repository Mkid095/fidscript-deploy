/**
 * Inbound attachment extraction — the per-message loop that downloads
 * each attachment from Stalwart, uploads it to the configured backend,
 * and records the EmailAttachment row. Extracted from
 * AttachmentStorageService to keep that orchestration file under the
 * 150-line ANPAS limit.
 */
import { Injectable, Logger } from '@nestjs/common';
import { AttachmentConfigService } from './attachment-config.service';
import { PlatformMailboxMessageService } from './platform-mailbox-message.service';
import { AttachmentStorageS3Service } from './attachment-storage-s3.service';

@Injectable()
export class AttachmentExtractInboundService {
  private readonly logger = new Logger(AttachmentExtractInboundService.name);

  constructor(
    private configService: AttachmentConfigService,
    private mailboxMessages: PlatformMailboxMessageService,
    private s3: AttachmentStorageS3Service,
  ) {}

  /**
   * Extract all attachments from an inbound message and upload them to
   * the configured storage backend. Idempotent — skips if attachments
   * have already been extracted for this messageId.
   */
  async extract(
    mailboxLocal: string,
    jmapMessageId: string,
  ): Promise<{ stored: number; skipped: number }> {
    const existing = await this.s3.inboundAlreadyExtracted(jmapMessageId);
    if (existing > 0) {
      this.logger.debug(`Attachments already extracted for message ${jmapMessageId}, skipping`);
      return { stored: 0, skipped: existing };
    }

    const { provider, credentials } = await this.configService.get();
    if (provider === 'internal') {
      this.logger.debug(`Provider is 'internal' — attachments stay in Stalwart`);
      return { stored: 0, skipped: 0 };
    }

    const atts = await this.mailboxMessages.listAttachments(mailboxLocal, jmapMessageId);
    if (!atts.length) {
      this.logger.debug(`No attachments on message ${jmapMessageId}`);
      return { stored: 0, skipped: 0 };
    }

    this.logger.log(`Extracting ${atts.length} attachment(s) from ${jmapMessageId} → ${provider}`);

    let stored = 0;
    for (const att of atts) {
      try {
        const { bytes, type, name, size } = await this.mailboxMessages.downloadAttachment(
          mailboxLocal, jmapMessageId, att.blobId,
        );
        const key = AttachmentStorageS3Service.buildInboundKey(
          mailboxLocal, jmapMessageId, name ?? att.blobId,
        );
        const { storageKey, storageProvider } = await this.s3.upload(
          provider, key, bytes, type ?? 'application/octet-stream', credentials,
        );
        await this.s3.recordAttachment(
          jmapMessageId, mailboxLocal, name ?? att.blobId,
          type ?? 'application/octet-stream', size ?? bytes.length,
          storageKey, storageProvider, 'inbound',
        );
        stored++;
        this.logger.log(`Stored "${name ?? att.blobId}" (${size ?? bytes.length}B) → ${provider}:${storageKey}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to extract ${att.blobId} (${att.name}): ${msg}`);
      }
    }
    return { stored, skipped: 0 };
  }
}
