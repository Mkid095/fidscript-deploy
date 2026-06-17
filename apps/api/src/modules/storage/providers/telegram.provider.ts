import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider, UploadResult, ProviderCredentials } from './storage-provider.interface';

export interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

@Injectable()
export class TelegramProvider implements StorageProvider {
  name = 'telegram';
  private readonly logger = new Logger(TelegramProvider.name);

  async makeBucket(_bucketName: string): Promise<void> {}
  async removeBucket(_bucketName: string): Promise<void> {}

  async upload(
    key: string,
    data: Buffer,
    mimeType?: string,
    _projectSlug?: string,
    _bucketDisplayName?: string,
    credentials?: ProviderCredentials,
  ): Promise<UploadResult> {
    const creds = credentials as TelegramCredentials | undefined;
    if (!creds) throw new Error('Telegram credentials required');

    const formData = new FormData();
    formData.append('chat_id', creds.chatId);
    formData.append('document', new Blob([data], { type: mimeType || 'application/octet-stream' }), key);

    const resp = await fetch(`https://api.telegram.org/bot${creds.botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    const result: any = await resp.json();
    if (!result.ok) throw new Error(result.description);

    return { key, etag: result.result.document.file_id, size: data.length, mimeType };
  }

  async download(key: string, _projectSlug?: string, _bucketDisplay?: string, credentials?: ProviderCredentials): Promise<Buffer> {
    const creds = credentials as TelegramCredentials | undefined;
    if (!creds) throw new Error('Telegram credentials required');

    const fileResp = await fetch(
      `https://api.telegram.org/bot${creds.botToken}/getFile?file_id=${key}`,
    );
    const fileResult: any = await fileResp.json();
    if (!fileResult.ok) throw new Error(fileResult.description);

    const fileContent = await fetch(
      `https://api.telegram.org/file/bot${creds.botToken}/${fileResult.result.file_path}`,
    );
    return Buffer.from(await fileContent.arrayBuffer());
  }

  async delete(_key: string): Promise<void> {
    this.logger.warn('Telegram provider does not support file deletion');
  }

  async list(_prefix?: string): Promise<string[]> {
    this.logger.warn('Telegram provider does not support listing');
    return [];
  }

  async getSignedUrl(key: string, _expiresInSeconds?: number, credentials?: ProviderCredentials): Promise<string> {
    const creds = credentials as TelegramCredentials | undefined;
    if (!creds) throw new Error('Telegram credentials required');
    return `https://api.telegram.org/bot${creds.botToken}/getFile?file_id=${key}`;
  }
}
