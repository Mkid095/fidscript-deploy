import { Module } from '@nestjs/common';
import { StorageController } from '@/modules/storage/controllers/storage.controller';
import { StorageService } from '@/modules/storage/services/storage.service';
import { StorageBucketService } from '@/modules/storage/services/storage-bucket.service';
import { StorageFileService } from '@/modules/storage/services/storage-file.service';
import { StorageUrlService } from '@/modules/storage/services/storage-url.service';
import { StorageAccessService } from '@/modules/storage/services/storage-access.service';
import { StorageCredentialsService } from '@/modules/storage/services/storage-credentials.service';
import { MinioProvider } from '@/modules/storage/providers/minio.provider';
import { MinioBucketService } from '@/modules/storage/providers/minio-bucket.service';
import { CloudinaryProvider } from '@/modules/storage/providers/cloudinary.provider';
import { TelegramProvider } from '@/modules/storage/providers/telegram.provider';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';

@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    StorageBucketService,
    StorageFileService,
    StorageUrlService,
    StorageAccessService,
    StorageCredentialsService,
    MinioProvider,
    MinioBucketService,
    CloudinaryProvider,
    TelegramProvider,
    StorageProviderFactory,
  ],
  exports: [StorageService, MinioProvider],
})
export class StorageModule {}