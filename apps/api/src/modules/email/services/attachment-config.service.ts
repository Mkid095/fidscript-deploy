/**
 * Attachment storage backend configuration service.
 *
 * Manages the platform-wide singleton that records which storage backend
 * (internal/MinIO, Telegram, or Cloudinary) is used for email attachments.
 * Credentials are encrypted with the platform ENCRYPTION_KEY (AES-256-GCM)
 * and stored as an encrypted JSON blob in the DB.
 *
 * Usage:
 *   const { provider, credentials } = await attachmentConfigService.get();
 *   const provider = this.factory.get(provider);
 *   await provider.upload(key, bytes, type, undefined, undefined, credentials);
 */
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';

export type StorageBackend = 'internal' | 'telegram' | 'cloudinary';

export interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface AttachmentConfig {
  provider: StorageBackend;
  /** Decrypted credentials — null for 'internal' or if not configured */
  credentials?: TelegramCredentials | CloudinaryCredentials;
  isActive: boolean;
}

@Injectable()
export class AttachmentConfigService {
  private readonly logger = new Logger(AttachmentConfigService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly factory: StorageProviderFactory,
  ) {}

  /**
   * Lazily resolve PrismaService — handles cases where the constructor-injected
   * instance is undefined (e.g., when NestJS resolves the provider in a sub-graph
   * before the global PrismaService singleton is fully wired).
   */
  private get prisma(): PrismaService {
    if (this._prisma) return this._prisma;
    this._prisma = this.moduleRef.get(PrismaService, { strict: false }) ?? undefined;
    if (!this._prisma) throw new Error('PrismaService unavailable — ensure PrismaModule is imported globally');
    return this._prisma;
  }
  private _prisma: PrismaService | undefined;

  /**
   * Read the current singleton config (creating a default if absent).
   * Credentials are decrypted before returning.
   */
  async get(): Promise<AttachmentConfig> {
    const row = await this.prisma.emailAttachmentConfig.findFirst();

    if (!row) {
      return { provider: 'internal', isActive: true };
    }

    let credentials: AttachmentConfig['credentials'] = undefined;
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

  /**
   * Public config (safe to return via API — never exposes credentials).
   */
  async getPublic(): Promise<{ provider: StorageBackend; isActive: boolean; hasCredentials: boolean }> {
    const full = await this.get();
    return {
      provider: full.provider,
      isActive: full.isActive,
      hasCredentials: full.provider === 'internal' || !!full.credentials,
    };
  }

  /**
   * Update the singleton config. If provider is 'internal', credentials may be
   * omitted. For 'telegram' and 'cloudinary', credentials are encrypted and
   * stored; for 'internal' the credentials field is cleared.
   */
  async update(dto: {
    provider: StorageBackend;
    credentials?: TelegramCredentials | CloudinaryCredentials;
  }): Promise<void> {
    const { provider, credentials } = dto;

    if (!['internal', 'telegram', 'cloudinary'].includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }
    if (provider !== 'internal' && !credentials) {
      throw new Error(`${provider} requires credentials`);
    }

    let encrypted: object | undefined;
    if (provider !== 'internal' && credentials) {
      const ct = this.crypto.encrypt(JSON.stringify(credentials));
      encrypted = { ct };
    }

    await this.prisma.emailAttachmentConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        provider,
        credentials: encrypted,
        isActive: true,
      },
      update: {
        provider,
        credentials: encrypted ?? undefined,
        isActive: true,
      },
    });

    this.logger.log(`Attachment storage config updated: provider=${provider}`);
  }

  /**
   * Test connectivity by performing a small round-trip (upload + delete)
   * against the chosen provider with the given credentials.
   */
  async testConnection(
    provider: StorageBackend,
    credentials: TelegramCredentials | CloudinaryCredentials | undefined,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const prov = this.factory.get(provider);
      const testKey = `fidscript-test/${Date.now()}-ping.txt`;
      const testData = Buffer.from('ping');

      const result = await prov.upload(
        testKey,
        testData,
        'text/plain',
        undefined,
        undefined,
        credentials,
      );

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