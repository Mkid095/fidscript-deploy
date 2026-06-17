import { Injectable } from '@nestjs/common';
import { StorageProvider } from './storage-provider.interface';
import { CloudinaryProvider } from './cloudinary.provider';
import { TelegramProvider } from './telegram.provider';
import { MinioProvider } from './minio.provider';

@Injectable()
export class StorageProviderFactory {
  constructor(private minioProvider: MinioProvider) {}

  get(provider: string): StorageProvider {
    switch (provider) {
      case 'internal': return this.minioProvider;
      case 'cloudinary': return new CloudinaryProvider();
      case 'telegram': return new TelegramProvider();
      default: throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
}
