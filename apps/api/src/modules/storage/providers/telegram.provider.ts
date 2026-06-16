import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResult } from './storage-provider.interface.js';

@Injectable()
export class TelegramProvider implements StorageProvider {
  name = 'telegram';
  private readonly logger = new Logger(TelegramProvider.name);
  private botToken: string = '';
  private chatId: string = '';

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID', '');
    if (!this.botToken) {
      this.logger.warn('Telegram bot token not configured');
    }
  }

  async upload(key: string, data: Buffer, mimeType?: string): Promise<UploadResult> {
    if (!this.botToken) throw new Error('Telegram not configured');

    const formData = new FormData();
    formData.append('chat_id', this.chatId);
    formData.append('document', new Blob([data], { type: mimeType || 'application/octet-stream' }), key);

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.description);

    const fileId = result.result.document.file_id;

    return {
      key,
      etag: fileId,
      size: data.length,
      mimeType,
    };
  }

  async download(key: string): Promise<Buffer> {
    if (!this.botToken) throw new Error('Telegram not configured');

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getFile?file_id=${key}`);
    const result = await response.json();

    if (!result.ok) throw new Error(result.description);

    const filePath = result.result.file_path;
    const fileResponse = await fetch(`https://api.telegram.org/file/bot${this.botToken}/${filePath}`);
    return Buffer.from(await fileResponse.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    this.logger.warn('Telegram provider does not support file deletion');
  }

  async list(prefix?: string): Promise<string[]> {
    this.logger.warn('Telegram provider does not support listing');
    return [];
  }

  async getSignedUrl(key: string): Promise<string> {
    return `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${key}`;
  }
}
