/**
 * Attachment storage pipeline — facade. The inbound extraction and the
 * outbound storage are delegated; this service holds the listing +
 * signed-URL entry points.
 *
 * Split into:
 *   - AttachmentStorageS3Service — backend upload / signed-URL / DB row ops
 *   - AttachmentExtractInboundService — per-message inbound extraction loop
 *   - AttachmentStorageService (this) — orchestration + list/getDownloadUrl
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { AttachmentConfigService } from './attachment-config.service';
import { AttachmentStorageS3Service, OutboundFile } from './attachment-storage-s3.service';
import { AttachmentExtractInboundService } from './attachment-extract-inbound.service';

@Injectable()
export class AttachmentStorageService {
  private readonly logger = new Logger(AttachmentStorageService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private configService: AttachmentConfigService,
    private s3: AttachmentStorageS3Service,
    private extract: AttachmentExtractInboundService,
  ) {}

  private get prisma(): PrismaService {
    if (this._prisma) return this._prisma;
    this._prisma = this.moduleRef.get(PrismaService, { strict: false }) ?? undefined;
    if (!this._prisma) throw new Error('PrismaService unavailable');
    return this._prisma;
  }
  private _prisma: PrismaService | undefined;

  /** Extract inbound attachments (delegated). */
  extractInboundAttachments(mailboxLocal: string, jmapMessageId: string, _projectId: string) {
    return this.extract.extract(mailboxLocal, jmapMessageId);
  }

  /**
   * Store outbound attachments (files attached to a composed message
   * that was sent via the compose UI).
   */
  async storeOutboundAttachments(mailboxLocal: string, sendId: string, files: OutboundFile[]): Promise<number> {
    if (!files.length) return 0;
    const { provider, credentials } = await this.configService.get();
    let stored = 0;
    for (const file of files) {
      const key = AttachmentStorageS3Service.buildOutboundKey(mailboxLocal, sendId, file.filename);
      const { storageKey, storageProvider } = await this.s3.upload(
        provider, key, file.bytes, file.mimeType, credentials,
      );
      await this.s3.recordAttachment(
        sendId, mailboxLocal, file.filename, file.mimeType, file.bytes.length,
        storageKey, storageProvider, 'outbound',
      );
      stored++;
      this.logger.log(`Stored outbound "${file.filename}" → ${provider}:${storageKey}`);
    }
    return stored;
  }

  /** Get a pre-signed download URL for a stored attachment. */
  async getDownloadUrl(attachmentId: string): Promise<string> {
    const att = await this.prisma.emailAttachment.findUnique({ where: { id: attachmentId } });
    if (!att) throw new NotFoundException(`Attachment ${attachmentId} not found`);
    return this.s3.resolveDownloadUrl({
      id: att.id, storageProvider: att.storageProvider, storageKey: att.storageKey,
    });
  }

  /** List stored attachments for a given message. */
  async listForMessage(messageId: string, direction?: 'inbound' | 'outbound') {
    const where: Record<string, unknown> = { messageId };
    if (direction) where.direction = direction;
    const atts = await this.prisma.emailAttachment.findMany({ where });
    return Promise.all(atts.map((a) => this.mapAttachment(a)));
  }

  private async mapAttachment(a: {
    id: string; filename: string; mimeType: string; sizeBytes: bigint | number; storageProvider: string;
  }) {
    return {
      id: a.id, filename: a.filename, mimeType: a.mimeType,
      sizeBytes: Number(a.sizeBytes), storageProvider: a.storageProvider,
      downloadUrl: await this.getDownloadUrl(a.id),
    };
  }
}

export { OutboundFile } from './attachment-storage-s3.service';
export { StorageBackend } from './attachment-config.service';
