import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResult } from './storage-provider.interface.js';

@Injectable()
export class MinioProvider implements StorageProvider {
  name = 'minio';
  private readonly logger = new Logger(MinioProvider.name);
  private client: any = null;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'fidscript');
    this.initClient();
  }

  private async initClient() {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');

    try {
      const { Client } = await import('minio');
      this.client = new Client({
        endPoint: endpoint.split(':')[0],
        port: parseInt(endpoint.split(':')[1] || '9000'),
        useSSL: false,
        accessKey,
        secretKey,
      });
      this.logger.log(`MinIO client initialized for ${endpoint}`);
    } catch (error) {
      this.logger.warn('MinIO client initialization failed:', error.message);
    }
  }

  async upload(key: string, data: Buffer, mimeType?: string): Promise<UploadResult> {
    if (!this.client) throw new Error('MinIO client not initialized');

    await this.client.putObject(this.bucket, key, data, {
      'Content-Type': mimeType || 'application/octet-stream',
    });

    return {
      key,
      etag: `"${Buffer.from(`${Date.now()}-${key}`).toString('base64')}"`,
      size: data.length,
      mimeType,
    };
  }

  async download(key: string): Promise<Buffer> {
    if (!this.client) throw new Error('MinIO client not initialized');

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.client.getObject(this.bucket, key, (err, stream: any) => {
        if (err) return reject(err);
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.client) throw new Error('MinIO client not initialized');
    await this.client.removeObject(this.bucket, key);
  }

  async list(prefix?: string): Promise<string[]> {
    if (!this.client) throw new Error('MinIO client not initialized');

    return new Promise((resolve, reject) => {
      const files: string[] = [];
      const stream = this.client.listObjects(this.bucket, prefix, true);
      stream.on('data', (obj: any) => files.push(obj.name));
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.client) throw new Error('MinIO client not initialized');

    return this.client.presignedGetObject(this.bucket, key, expiresInSeconds);
  }
}
