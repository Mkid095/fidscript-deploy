import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';
import { MinioProvider } from './providers/minio.provider.js';
import { CloudinaryProvider } from './providers/cloudinary.provider.js';
import { TelegramProvider } from './providers/telegram.provider.js';

@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    MinioProvider,
    CloudinaryProvider,
    TelegramProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}
