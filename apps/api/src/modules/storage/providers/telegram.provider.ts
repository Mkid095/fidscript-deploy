import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider, UploadResult, ProviderCredentials, ConnectionTestResult } from './storage-provider.interface';

export interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

@Injectable()
export class TelegramProvider implements StorageProvider {
  name = 'telegram';
  private readonly logger = new Logger(TelegramProvider.name);

  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const creds = credentials as TelegramCredentials | undefined;
    if (!creds || !creds.botToken || !creds.chatId) {
      return { ok: false, error: 'Bot token and chat ID are both required.' };
    }
    // Step 1: getMe — confirms the bot token is valid and returns the bot's name.
    let botName = 'bot';
    try {
      const meResp = await fetch(`https://api.telegram.org/bot${creds.botToken}/getMe`);
      const meResult: any = await meResp.json();
      if (!meResult.ok) {
        return { ok: false, error: this.translateBotError(meResult.description ?? 'Unknown error') };
      }
      botName = meResult.result?.username ?? botName;
    } catch (err: unknown) {
      return { ok: false, error: `Cannot reach Telegram (network error: ${(err as Error).message}).` };
    }

    // Step 2: getChat — confirms the chat ID is reachable AND the bot has access.
    try {
      const chatResp = await fetch(`https://api.telegram.org/bot${creds.botToken}/getChat?chat_id=${encodeURIComponent(creds.chatId)}`);
      const chatResult: any = await chatResp.json();
      if (!chatResult.ok) {
        return { ok: false, error: this.translateChatError(chatResult.description ?? 'Unknown error') };
      }
      const title = chatResult.result?.title ?? chatResult.result?.username ?? chatResult.result?.first_name ?? 'chat';
      return { ok: true, detail: `Bot @${botName} connected to "${title}".` };
    } catch (err: unknown) {
      return { ok: false, error: `Cannot reach Telegram (network error: ${(err as Error).message}).` };
    }
  }

  private translateBotError(message: string): string {
    if (/invalid token/i.test(message)) return 'Bot token is invalid. Get a fresh one from @BotFather.';
    if (/unauthorized/i.test(message)) return 'Bot token was revoked. Generate a new one from @BotFather.';
    return message;
  }

  private translateChatError(message: string): string {
    if (/chat not found/i.test(message)) return 'Chat not found. For private chats, the user must message the bot first. For groups, the bot must be added.';
    if (/bot was blocked/i.test(message)) return 'Bot was blocked by the user. Ask them to unblock and message it.';
    if (/not enough rights/i.test(message) || /admin/i.test(message)) return 'Bot lacks permission to read the chat. Make the bot an admin in groups/channels.';
    if (/chat_id is empty/i.test(message)) return 'Chat ID is empty or invalid.';
    return message;
  }

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
