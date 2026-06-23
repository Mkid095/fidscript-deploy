/**
 * Attachment storage pipeline — the bridge between email messages and the
 * admin-selected storage backend.
 *
 * Architecture:
 *   Inbound path  (queue worker → this service)
 *     PlatformMailboxMessageService.downloadAttachment(blobId)
 *       → Buffer bytes
 *       → provider.upload(key, bytes, type)
 *       → EmailAttachment row persisted (direction=inbound)
 *
 *   Outbound path (compose send → this service)
 *     Buffer bytes already in the DTO
 *       → provider.upload(key, bytes, type)
 *       → EmailAttachment row persisted (direction=outbound)
 *
 * The provider is resolved from AttachmentConfigService at call time, so
 * any credential rotation takes effect on the next invocation.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { AttachmentConfigService, StorageBackend } from './attachment-config.service';
import { PlatformMailboxMessageService } from './platform-mailbox-message.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { StorageProvider } from '@/modules/storage/providers/storage-provider.interface';
import { TelegramCredentials, CloudinaryCredentials } from './attachment-config.service';

export interface OutboundFile {
  filename: string;
  bytes: Buffer;
  mimeType: string;
}

@Injectable()
export class AttachmentStorageService {
  private readonly logger = new Logger(AttachmentStorageService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private config: ConfigService,
    private configService: AttachmentConfigService,
    private mailboxMessages: PlatformMailboxMessageService,
    private factory: StorageProviderFactory,
  ) {}

  /**
   * Lazily resolve PrismaService — defensive pattern for sub-graph injection.
   */
  private get prisma(): PrismaService {
    if (this._prisma) return this._prisma;
    this._prisma = this.moduleRef.get(PrismaService, { strict: false }) ?? undefined;
    if (!this._prisma) throw new Error('PrismaService unavailable');
    return this._prisma;
  }
  private _prisma: PrismaService | undefined;

  /**
   * Extract all attachments from an inbound message and upload them to the
   * configured storage backend. Idempotent — skips if attachments have already
   * been extracted for this messageId.
   *
   * Called by the queue worker when `email.received` fires.
   */
  async extractInboundAttachments(
    mailboxLocal: string,
    jmapMessageId: string,
    _projectId: string,
  ): Promise<{ stored: number; skipped: number }> {
    // Check idempotency
    const existing = await this.prisma.emailAttachment.count({
      where: { messageId: jmapMessageId, direction: 'inbound' },
    });
    if (existing > 0) {
      this.logger.debug(`Attachments already extracted for message ${jmapMessageId}, skipping`);
      return { stored: 0, skipped: existing };
    }

    // Resolve config
    const { provider, credentials } = await this.configService.get();
    if (provider === 'internal') {
      // Internal means Stalwart's own blob store — no extraction needed; the
      // message and its attachments already live in Stalwart, which is fine.
      this.logger.debug(`Provider is 'internal' — skipping extraction, attachments stay in Stalwart`);
      return { stored: 0, skipped: 0 };
    }

    // Fetch attachment list from JMAP
    const atts = await this.mailboxMessages.listAttachments(mailboxLocal, jmapMessageId);
    if (!atts.length) {
      this.logger.debug(`No attachments on message ${jmapMessageId}`);
      return { stored: 0, skipped: 0 };
    }

    this.logger.log(`Extracting ${atts.length} attachment(s) from message ${jmapMessageId} → ${provider}`);

    const prov = this.factory.get(provider);
    let stored = 0;

    for (const att of atts) {
      try {
        // Download blob from Stalwart
        const { bytes, type, name, size } = await this.mailboxMessages.downloadAttachment(
          mailboxLocal,
          jmapMessageId,
          att.blobId,
        );

        // Upload to chosen backend
        const key = `mail/${mailboxLocal}/${jmapMessageId}/${name ?? att.blobId}`;
        const result = await prov.upload(
          key,
          bytes,
          type ?? 'application/octet-stream',
          undefined,
          undefined,
          credentials as TelegramCredentials | CloudinaryCredentials | undefined,
        );

        // Persist record
        await this.prisma.emailAttachment.create({
          data: {
            messageId: jmapMessageId,
            mailboxLocal,
            filename: name ?? att.blobId,
            mimeType: type ?? 'application/octet-stream',
            sizeBytes: BigInt(size ?? bytes.length),
            storageKey: result.key ?? result.etag,
            storageProvider: provider,
            direction: 'inbound',
          },
        });

        stored++;
        this.logger.log(`Stored attachment "${name ?? att.blobId}" (${size ?? bytes.length} bytes) → ${provider}:${result.key}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to extract attachment ${att.blobId} (${att.name}): ${msg}`);
        // Continue with other attachments — don't fail the whole batch
      }
    }

    return { stored, skipped: 0 };
  }

  /**
   * Store outbound attachments (files attached to a composed message that was
   * sent via the compose UI). Called by PlatformAdminMailController after the
   * SMTP send succeeds.
   */
  async storeOutboundAttachments(
    mailboxLocal: string,
    sendId: string,
    files: OutboundFile[],
  ): Promise<number> {
    if (!files.length) return 0;

    const { provider, credentials } = await this.configService.get();
    const prov = this.factory.get(provider);

    // For internal storage, Stalwart stores the attachment as part of the SMTP
    // message — no separate extraction needed. But we still record the reference.
    if (provider === 'internal') {
      this.logger.debug(`Provider is internal — recording outbound attachment refs without external upload`);
    }

    for (const file of files) {
      const key = `outbound/${mailboxLocal}/${sendId}/${file.filename}`;
      let storageKey: string;

      if (provider === 'internal') {
        storageKey = key;
      } else {
        const result = await prov.upload(
          key,
          file.bytes,
          file.mimeType,
          undefined,
          undefined,
          credentials as TelegramCredentials | CloudinaryCredentials | undefined,
        );
        storageKey = result.key ?? result.etag;
      }

      await this.prisma.emailAttachment.create({
        data: {
          messageId: sendId,
          mailboxLocal,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: BigInt(file.bytes.length),
          storageKey,
          storageProvider: provider,
          direction: 'outbound',
        },
      });

      this.logger.log(`Stored outbound attachment "${file.filename}" → ${provider}:${storageKey}`);
    }

    return files.length;
  }

  /**
   * Get a pre-signed download URL for a stored attachment.
   * Returns a proxied URL for Telegram (which has no true signed-URL concept).
   */
  async getDownloadUrl(attachmentId: string): Promise<string> {
    const att = await this.prisma.emailAttachment.findUnique({ where: { id: attachmentId } });
    if (!att) throw new NotFoundException(`Attachment ${attachmentId} not found`);

    if (att.storageProvider === 'telegram') {
      return `https://api.telegram.org/bot<token>/getFile?file_id=${att.storageKey}`;
    }

    const prov = this.factory.get(att.storageProvider as StorageBackend);
    return prov.getSignedUrl(att.storageKey, 3600);
  }

  /**
   * List stored attachments for a given message.
   */
  async listForMessage(messageId: string, direction?: 'inbound' | 'outbound'): Promise<
    Array<{
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      storageProvider: string;
      downloadUrl: string;
    }>
  > {
    const where: Record<string, unknown> = { messageId };
    if (direction) where.direction = direction;

    const atts = await this.prisma.emailAttachment.findMany({ where });
    return Promise.all(
      atts.map(async (a) => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: Number(a.sizeBytes),
        storageProvider: a.storageProvider,
        downloadUrl: await this.getDownloadUrl(a.id),
      })),
    );
  }
}