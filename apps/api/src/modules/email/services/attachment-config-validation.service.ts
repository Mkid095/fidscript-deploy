/**
 * Attachment config validation — input shape + provider-specific rules.
 * Pure functions, no I/O.
 */
import { Injectable } from '@nestjs/common';
import { StorageBackend } from './attachment-config.service';
import { TelegramCredentials } from '@/modules/storage/providers/telegram.provider';
import { CloudinaryCredentials } from '@/modules/storage/providers/cloudinary.provider';

@Injectable()
export class AttachmentConfigValidationService {
  /** Whitelist of valid backends. */
  private readonly validProviders: StorageBackend[] = ['internal', 'telegram', 'cloudinary'];

  /** Throws if the DTO is not a valid {provider, credentials?} pair. */
  assertValid(dto: {
    provider: StorageBackend;
    credentials?: TelegramCredentials | CloudinaryCredentials;
  }): void {
    if (!this.validProviders.includes(dto.provider)) {
      throw new Error(`Invalid provider: ${dto.provider}`);
    }
    if (dto.provider !== 'internal' && !dto.credentials) {
      throw new Error(`${dto.provider} requires credentials`);
    }
  }

  /**
   * Verify the credentials are the right shape for the chosen provider.
   * Light validation — does not hit the network.
   */
  assertCredentialsShape(
    provider: StorageBackend,
    credentials: TelegramCredentials | CloudinaryCredentials | undefined,
  ): void {
    if (provider === 'internal') return;
    if (!credentials) throw new Error(`${provider} requires credentials`);
    if (provider === 'telegram') {
      const t = credentials as TelegramCredentials;
      if (!t.botToken) throw new Error('telegram: botToken is required');
    }
    if (provider === 'cloudinary') {
      const c = credentials as CloudinaryCredentials;
      if (!c.cloudName || !c.apiKey || !c.apiSecret) {
        throw new Error('cloudinary: cloudName, apiKey, apiSecret are required');
      }
    }
  }
}
