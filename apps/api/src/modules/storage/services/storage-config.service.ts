import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class StorageConfigService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private eventService: EventService,
  ) {}

  async getOrCreateConfig(projectId: string) {
    let config = await this.prisma.projectStorageConfig.findUnique({
      where: { projectId },
    });
    if (!config) {
      config = await this.prisma.projectStorageConfig.create({
        data: { projectId, defaultProvider: 'internal' },
      });
    }
    return config;
  }

  async updateConfig(projectId: string, data: { defaultProvider?: string }) {
    const config = await this.getOrCreateConfig(projectId);
    const updated = await this.prisma.projectStorageConfig.update({
      where: { projectId },
      data: { defaultProvider: data.defaultProvider ?? config.defaultProvider },
    });
    // storage.config.updated event not yet in events package — omit for now
    // await this.eventService.emit('storage.config.updated', { projectId, config: updated });
    return updated;
  }

  async setCredentials(
    projectId: string,
    provider: 'cloudinary' | 'telegram',
    values: Record<string, string>,
  ) {
    const encrypt = (plaintext: string) => this.crypto.encrypt(plaintext);

    if (provider === 'cloudinary') {
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: 'CLOUDINARY_CLOUD_NAME' } },
        update: { value: encrypt(values.cloudName) },
        create: { projectId, key: 'CLOUDINARY_CLOUD_NAME', value: encrypt(values.cloudName) },
      });
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: 'CLOUDINARY_API_KEY' } },
        update: { value: encrypt(values.apiKey) },
        create: { projectId, key: 'CLOUDINARY_API_KEY', value: encrypt(values.apiKey) },
      });
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: 'CLOUDINARY_API_SECRET' } },
        update: { value: encrypt(values.apiSecret) },
        create: { projectId, key: 'CLOUDINARY_API_SECRET', value: encrypt(values.apiSecret) },
      });
      await this.prisma.projectStorageConfig.update({
        where: { projectId },
        data: { cloudinaryCredsSet: true },
      });
    } else if (provider === 'telegram') {
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: 'TELEGRAM_BOT_TOKEN' } },
        update: { value: encrypt(values.botToken) },
        create: { projectId, key: 'TELEGRAM_BOT_TOKEN', value: encrypt(values.botToken) },
      });
      await this.prisma.projectEnv.upsert({
        where: { projectId_key: { projectId, key: 'TELEGRAM_CHAT_ID' } },
        update: { value: encrypt(values.chatId) },
        create: { projectId, key: 'TELEGRAM_CHAT_ID', value: encrypt(values.chatId) },
      });
      await this.prisma.projectStorageConfig.update({
        where: { projectId },
        data: { telegramCredsSet: true },
      });
    }

    return this.getOrCreateConfig(projectId);
  }

  async deleteCredentials(projectId: string, provider: 'cloudinary' | 'telegram') {
    if (provider === 'cloudinary') {
      await this.prisma.projectEnv.deleteMany({
        where: {
          projectId,
          key: { in: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] },
        },
      });
      await this.prisma.projectStorageConfig.update({
        where: { projectId },
        data: { cloudinaryCredsSet: false },
      });
    } else if (provider === 'telegram') {
      await this.prisma.projectEnv.deleteMany({
        where: {
          projectId,
          key: { in: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'] },
        },
      });
      await this.prisma.projectStorageConfig.update({
        where: { projectId },
        data: { telegramCredsSet: false },
      });
    }

    return this.getOrCreateConfig(projectId);
  }
}