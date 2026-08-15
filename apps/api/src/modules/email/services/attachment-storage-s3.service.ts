/**
 * Attachment storage backend operations — the platform's "S3-or-equivalent"
 * layer. The platform supports three backends (internal/MinIO, Telegram,
 * Cloudinary). This service owns the actual byte upload / delete / signed-URL
 * calls; the higher-level AttachmentStorageService handles orchestration
 * (idempotency, DB row persistence, listing).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { StorageProvider } from '@/modules/storage/providers/storage-provider.interface';
import { TelegramCredentials } from '@/modules/storage/providers/telegram.provider';
import { CloudinaryCredentials } from '@/modules/storage/providers/cloudinary.provider';
import { StorageBackend } from './attachment-config.service';

export interface OutboundFile {
  filename: string;
  bytes: Buffer;
  mimeType: string;
}

export interface UploadResult {
  storageKey: string;
  storageProvider: string;
}

@Injectable()
export class AttachmentStorageS3Service {
  private readonly logger = new Logger(AttachmentStorageS3Service.name);

  constructor(
    private prisma: PrismaService,
    private factory: StorageProviderFactory,
  ) {}

  /**
   * Upload a single file to the configured backend. Returns the storage key
   * (or the etag if no key was provided) plus the provider id for DB rows.
   * For `internal` storage, the caller may pass null credentials.
   */
  async upload(
    provider: StorageBackend,
    key: string,
    bytes: Buffer,
    type: string,
    credentials: TelegramCredentials | CloudinaryCredentials | undefined,
  ): Promise<UploadResult> {
    if (provider === 'internal') {
      return { storageKey: key, storageProvider: 'internal' };
    }
    const prov = this.factory.get(provider);
    const result = await prov.upload(key, bytes, type, undefined, undefined, credentials);
    return { storageKey: result.key ?? result.etag, storageProvider: provider };
  }

  /**
   * Persist an EmailAttachment row. Idempotent at the application level —
   * callers should check first via the count-based existence test.
   */
  async recordAttachment(
    messageId: string,
    mailboxLocal: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    storageKey: string,
    storageProvider: string,
    direction: 'inbound' | 'outbound',
  ): Promise<void> {
    await this.prisma.emailAttachment.create({
      data: {
        messageId,
        mailboxLocal,
        filename,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        storageKey,
        storageProvider,
        direction,
      },
    });
  }

  /**
   * Idempotency check — has this message already had its inbound attachments
   * extracted?
   */
  async inboundAlreadyExtracted(jmapMessageId: string): Promise<number> {
    return this.prisma.emailAttachment.count({
      where: { messageId: jmapMessageId, direction: 'inbound' },
    });
  }

  /**
   * Resolve a download URL for a stored attachment.
   * Telegram has no true signed URLs, so we return a proxied URL shape that
   * the operator can use to fetch the file.
   */
  async resolveDownloadUrl(attachment: {
    id: string;
    storageProvider: string;
    storageKey: string;
  }): Promise<string> {
    if (attachment.storageProvider === 'telegram') {
      return `https://api.telegram.org/bot<token>/getFile?file_id=${attachment.storageKey}`;
    }
    const prov: StorageProvider = this.factory.get(attachment.storageProvider as StorageBackend);
    return prov.getSignedUrl(attachment.storageKey, 3600);
  }

  /**
   * Build the canonical key for a given message + filename. Centralized so
   * inbound and outbound paths stay in sync on the key shape.
   */
  static buildInboundKey(mailboxLocal: string, messageId: string, filename: string): string {
    return `mail/${mailboxLocal}/${messageId}/${filename}`;
  }

  static buildOutboundKey(mailboxLocal: string, sendId: string, filename: string): string {
    return `outbound/${mailboxLocal}/${sendId}/${filename}`;
  }
}
