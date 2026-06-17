import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CloudinaryCredentials } from '@/modules/storage/providers/cloudinary.provider';
import { TelegramCredentials } from '@/modules/storage/providers/telegram.provider';

@Injectable()
export class StorageCredentialsService {
  constructor(private prisma: PrismaService) {}

  async getProjectCredentials(projectId: string, provider: string): Promise<any> {
    const envVars = await this.prisma.projectEnv.findMany({ where: { projectId } });

    const decrypt = (ciphertext: string): string => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { CryptoService } = require('../crypto/crypto.service');
        // crypto is a module-level singleton — decrypt inline
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createDecipheriv, randomBytes } = require('crypto');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        const keyBase64 = process.env.ENCRYPTION_KEY || fs.readFileSync(
          process.env.ENCRYPTION_KEY_FILE || '', 'utf8'
        ).trim();
        const key = Buffer.from(keyBase64, 'base64');
        const parts = ciphertext.split(':');
        if (parts.length !== 3) throw new Error('Invalid ciphertext');
        const decipher = createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(parts[0], 'base64'),
        );
        decipher.setAuthTag(Buffer.from(parts[1], 'base64'));
        return decipher.update(Buffer.from(parts[2], 'base64'), '', 'utf8') + decipher.final('utf8');
      } catch {
        return ciphertext; // fallback: treat as plaintext (dev only)
      }
    };

    if (provider === 'cloudinary') {
      const cloudNameVar = envVars.find(e => e.key === 'CLOUDINARY_CLOUD_NAME');
      const apiKeyVar = envVars.find(e => e.key === 'CLOUDINARY_API_KEY');
      const apiSecretVar = envVars.find(e => e.key === 'CLOUDINARY_API_SECRET');
      if (!cloudNameVar || !apiKeyVar || !apiSecretVar) return undefined;
      return {
        cloudName: decrypt(cloudNameVar.value),
        apiKey: decrypt(apiKeyVar.value),
        apiSecret: decrypt(apiSecretVar.value),
      } as CloudinaryCredentials;
    }

    if (provider === 'telegram') {
      const botTokenVar = envVars.find(e => e.key === 'TELEGRAM_BOT_TOKEN');
      const chatIdVar = envVars.find(e => e.key === 'TELEGRAM_CHAT_ID');
      if (!botTokenVar || !chatIdVar) return undefined;
      return {
        botToken: decrypt(botTokenVar.value),
        chatId: decrypt(chatIdVar.value),
      } as TelegramCredentials;
    }

    return undefined;
  }
}