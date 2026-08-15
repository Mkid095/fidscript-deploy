/**
 * Attachment config CRUD — read / write the platform-wide singleton that
 * records which storage backend is used for email attachments.
 *
 * Credentials are encrypted with the platform ENCRYPTION_KEY (AES-256-GCM)
 * and stored as an encrypted JSON blob in the DB.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { StorageBackend, AttachmentConfig } from './attachment-config.service';
import { TelegramCredentials } from '@/modules/storage/providers/telegram.provider';
import { CloudinaryCredentials } from '@/modules/storage/providers/cloudinary.provider';
import { AttachmentConfigValidationService } from './attachment-config-validation.service';

@Injectable()
export class AttachmentConfigCrudService {
  private readonly logger = new Logger(AttachmentConfigCrudService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly crypto: CryptoService,
    private readonly factory: StorageProviderFactory,
    private readonly validation: AttachmentConfigValidationService,
  ) {}

  private get prisma(): PrismaService {
    if (this._prisma) return this._prisma;
    this._prisma = this.moduleRef.get(PrismaService, { strict: false }) ?? undefined;
    if (!this._prisma) throw new Error('PrismaService unavailable — ensure PrismaModule is imported globally');
    return this._prisma;
  }
  private _prisma: PrismaService | undefined;

  /** Read the current singleton config (creating a default if absent). */
  async get(): Promise<AttachmentConfig> {
    const row = await this.prisma.emailAttachmentConfig.findFirst();
    if (!row) return { provider: 'internal', isActive: true };

    let credentials: AttachmentConfig['credentials'];
    if (row.credentials && typeof row.credentials === 'object') {
      const ct = (row.credentials as { ct?: string }).ct;
      if (ct) {
        try {
          const json = this.crypto.decrypt(ct);
          credentials = JSON.parse(json) as TelegramCredentials | CloudinaryCredentials;
        } catch {
          credentials = undefined;
        }
      }
    }
    return {
      provider: (row.provider ?? 'internal') as StorageBackend,
      credentials,
      isActive: row.isActive ?? true,
    };
  }

  /** Public config (safe to return via API — never exposes credentials). */
  async getPublic(): Promise<{ provider: StorageBackend; isActive: boolean; hasCredentials: boolean }> {
    const full = await this.get();
    return {
      provider: full.provider,
      isActive: full.isActive,
      hasCredentials: full.provider === 'internal' || !!full.credentials,
    };
  }

  /** Update the singleton config. */
  async update(dto: {
    provider: StorageBackend;
    credentials?: TelegramCredentials | CloudinaryCredentials;
  }): Promise<void> {
    this.validation.assertValid(dto);
    this.validation.assertCredentialsShape(dto.provider, dto.credentials);

    let encrypted: object | undefined;
    if (dto.provider !== 'internal' && dto.credentials) {
      const ct = this.crypto.encrypt(JSON.stringify(dto.credentials));
      encrypted = { ct };
    }

    await this.prisma.emailAttachmentConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', provider: dto.provider, credentials: encrypted, isActive: true },
      update: { provider: dto.provider, credentials: encrypted ?? undefined, isActive: true },
    });

    this.logger.log(`Attachment storage config updated: provider=${dto.provider}`);
  }

  /** Round-trip connectivity test against the chosen provider. */
  async testConnection(
    provider: StorageBackend,
    credentials: TelegramCredentials | CloudinaryCredentials | undefined,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const prov = this.factory.get(provider);
      const testKey = `fidscript-test/${Date.now()}-ping.txt`;
      const testData = Buffer.from('ping');
      const result = await prov.upload(testKey, testData, 'text/plain', undefined, undefined, credentials);
      await prov.delete(result.key ?? result.etag);
      return {
        ok: true,
        message: `${provider}: test file uploaded and deleted successfully (key: ${result.key ?? result.etag})`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: msg };
    }
  }
}
