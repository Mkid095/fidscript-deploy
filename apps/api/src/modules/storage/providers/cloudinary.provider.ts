import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider, UploadResult, ProviderCredentials } from './storage-provider.interface';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  name = 'cloudinary';
  private readonly logger = new Logger(CloudinaryProvider.name);

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
    const creds = credentials as CloudinaryCredentials | undefined;
    if (!creds) throw new Error('Cloudinary credentials required');

    const cloudinary = await import('cloudinary');
    const v2 = cloudinary.v2;
    v2.config({ cloud_name: creds.cloudName, api_key: creds.apiKey, api_secret: creds.apiSecret });

    return new Promise((resolve, reject) => {
      const stream = v2.uploader.upload_stream(
        { folder: 'fidscript', public_id: key.replace(/\//g, '_'), resource_type: 'auto' },
        (err: any, result: any) => {
          if (err) return reject(err);
          resolve({ key, etag: result.etag || result.public_id, size: result.bytes, mimeType: result.format });
        },
      );
      stream.write(data);
      stream.end();
    });
  }

  async download(key: string, _projectSlug?: string, _bucketDisplay?: string, credentials?: ProviderCredentials): Promise<Buffer> {
    const creds = credentials as CloudinaryCredentials | undefined;
    if (!creds) throw new Error('Cloudinary credentials required');

    const cloudinary = await import('cloudinary');
    const v2 = cloudinary.v2;
    v2.config({ cloud_name: creds.cloudName, api_key: creds.apiKey, api_secret: creds.apiSecret });

    const result = await v2.api.resource(key, { resource_type: 'auto' });
    const resp = await fetch(result.secure_url);
    return Buffer.from(await resp.arrayBuffer());
  }

  async delete(key: string, _projectSlug?: string, _bucketDisplay?: string, credentials?: ProviderCredentials): Promise<void> {
    const creds = credentials as CloudinaryCredentials | undefined;
    if (!creds) throw new Error('Cloudinary credentials required');

    const cloudinary = await import('cloudinary');
    const v2 = cloudinary.v2;
    v2.config({ cloud_name: creds.cloudName, api_key: creds.apiKey, api_secret: creds.apiSecret });
    await v2.uploader.destroy(key);
  }

  async list(prefix?: string, _projectSlug?: string, _bucketDisplay?: string, credentials?: ProviderCredentials): Promise<string[]> {
    const creds = credentials as CloudinaryCredentials | undefined;
    if (!creds) throw new Error('Cloudinary credentials required');

    const cloudinary = await import('cloudinary');
    const v2 = cloudinary.v2;
    v2.config({ cloud_name: creds.cloudName, api_key: creds.apiKey, api_secret: creds.apiSecret });
    const result = await v2.api.resources({ type: 'upload', prefix: prefix || 'fidscript' });
    return result.resources.map((r: any) => r.public_id);
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds = 3600,
    _projectSlug?: string,
    _bucketDisplay?: string,
    credentials?: ProviderCredentials,
  ): Promise<string> {
    const creds = credentials as CloudinaryCredentials | undefined;
    if (!creds) throw new Error('Cloudinary credentials required');

    const cloudinary = await import('cloudinary');
    const v2 = cloudinary.v2;
    v2.config({ cloud_name: creds.cloudName, api_key: creds.apiKey, api_secret: creds.apiSecret });
    return v2.url(key, { sign_url: true, expire_seconds: expiresInSeconds });
  }
}
