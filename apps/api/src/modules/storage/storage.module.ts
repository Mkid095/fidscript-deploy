import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { MinioProvider } from './providers/minio.provider';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { TelegramProvider } from './providers/telegram.provider';

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
