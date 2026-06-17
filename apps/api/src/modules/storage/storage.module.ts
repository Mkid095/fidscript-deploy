import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { MinioProvider } from './providers/minio.provider';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { StorageProviderFactory } from './providers/storage-provider.factory';

@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    MinioProvider,
    CloudinaryProvider,
    TelegramProvider,
    StorageProviderFactory,
  ],
  exports: [StorageService],
})
export class StorageModule {}
