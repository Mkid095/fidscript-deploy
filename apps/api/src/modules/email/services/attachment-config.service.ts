/**
 * Attachment config service — facade.
 *
 * Split into:
 *   - AttachmentConfigValidationService — input shape + provider rules
 *   - AttachmentConfigCrudService — read / write / round-trip test
 *
 * Public types and the StorageBackend enum continue to be re-exported from
 * this file so existing import paths keep working.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { TelegramCredentials } from '@/modules/storage/providers/telegram.provider';
import { CloudinaryCredentials } from '@/modules/storage/providers/cloudinary.provider';
import { AttachmentConfigCrudService } from './attachment-config-crud.service';

export type { TelegramCredentials, CloudinaryCredentials };
export type StorageBackend = 'internal' | 'telegram' | 'cloudinary';

export interface AttachmentConfig {
  provider: StorageBackend;
  /** Decrypted credentials — null for 'internal' or if not configured */
  credentials?: TelegramCredentials | CloudinaryCredentials;
  isActive: boolean;
}

@Injectable()
export class AttachmentConfigService {
  constructor(
    private readonly crud: AttachmentConfigCrudService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly factory: StorageProviderFactory,
  ) {}

  get() { return this.crud.get(); }
  getPublic() { return this.crud.getPublic(); }
  update = (dto: Parameters<AttachmentConfigCrudService['update']>[0]) => this.crud.update(dto);
  testConnection = (
    provider: Parameters<AttachmentConfigCrudService['testConnection']>[0],
    credentials: Parameters<AttachmentConfigCrudService['testConnection']>[1],
  ) => this.crud.testConnection(provider, credentials);
}
