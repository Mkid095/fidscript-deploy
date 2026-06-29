import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { StorageController } from '@/modules/storage/controllers/storage.controller';
import { StorageConfigController } from '@/modules/storage/controllers/storage-config.controller';
import { StorageService } from '@/modules/storage/services/storage.service';
import { StorageConfigService } from '@/modules/storage/services/storage-config.service';
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
  imports: [forwardRef(() => AuthModule), ProjectsModule],
  controllers: [StorageController, StorageConfigController],
  providers: [
    StorageService,
    StorageConfigService,
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
  exports: [StorageService, MinioProvider, StorageProviderFactory],
})
export class StorageModule {}