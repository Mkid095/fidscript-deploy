import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResult } from './storage-provider.interface.js';

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  name = 'cloudinary';
  private readonly logger = new Logger(CloudinaryProvider.name);
  private cloudinary: any = null;

  constructor(private configService: ConfigService) {
    this.initClient();
  }

  private async initClient() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Cloudinary credentials not configured');
      return;
    }

    try {
      const cloudinaryModule = await import('cloudinary');
      this.cloudinary = cloudinaryModule.v2;
      this.cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary client initialized');
    } catch (error) {
      this.logger.warn('Cloudinary client initialization failed:', error.message);
    }
  }

  async upload(key: string, data: Buffer, mimeType?: string): Promise<UploadResult> {
    if (!this.cloudinary) throw new Error('Cloudinary not initialized');

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: 'fidscript',
          public_id: key.replace(/\//g, '_'),
          resource_type: 'auto',
        },
        (error: any, result: any) => {
          if (error) return reject(error);
          resolve({
            key,
            etag: result.etag || result.public_id,
            size: result.bytes,
            mimeType: result.format,
          });
        },
      );
      uploadStream.write(data);
      uploadStream.end();
    });
  }

  async download(key: string): Promise<Buffer> {
    if (!this.cloudinary) throw new Error('Cloudinary not initialized');

    const result = await this.cloudinary.api.resource(key, { resource_type: 'auto' });
    const response = await fetch(result.secure_url);
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    if (!this.cloudinary) throw new Error('Cloudinary not initialized');
    await this.cloudinary.uploader.destroy(key);
  }

  async list(prefix?: string): Promise<string[]> {
    if (!this.cloudinary) throw new Error('Cloudinary not initialized');

    const result = await this.cloudinary.api.resources({
      type: 'upload',
      prefix: prefix || 'fidscript',
    });
    return result.resources.map((r: any) => r.public_id);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.cloudinary) throw new Error('Cloudinary not initialized');

    return this.cloudinary.url(key, {
      sign_url: true,
      expire_seconds: expiresInSeconds,
    });
  }
}
