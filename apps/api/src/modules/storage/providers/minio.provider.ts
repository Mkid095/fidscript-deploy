import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResult } from './storage-provider.interface';
import { MinioBucketService } from './minio-bucket.service';

@Injectable()
export class MinioProvider implements StorageProvider, OnModuleInit {
  name = 'minio';
  private readonly logger = new Logger(MinioProvider.name);
  private client: any = null;
  private internalEndpoint = '';
  private externalEndpoint = '';

  constructor(
    private configService: ConfigService,
    private buckets: MinioBucketService,
  ) {
    this.internalEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'minio:9000');
    this.externalEndpoint = this.configService.get<string>('MINIO_EXTERNAL_ENDPOINT', this.internalEndpoint);
  }

  onModuleInit() {
    const [host, port = '9000'] = this.internalEndpoint.split(':');
    import('minio').then(({ Client }) => {
      this.client = new Client({
        endPoint: host,
        port: parseInt(port),
        useSSL: false,
        accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      });
      this.logger.log(`MinIO client initialized for ${this.internalEndpoint}`);
    }).catch(err => { this.logger.warn('MinIO client init failed: ' + err.message); });
  }

  private async ensureClient() {
    if (!this.client) { await new Promise(r => setTimeout(r, 500)); if (!this.client) throw new Error('MinIO client not initialized'); }
  }

  async makeBucket(bucketName: string, projectSlug?: string, _bucketDisplayName?: string): Promise<void> {
    await this.ensureClient();
    const bname = projectSlug && _bucketDisplayName ? this.buckets.buildBucketName(projectSlug, _bucketDisplayName) : bucketName;
    try { await this.client.makeBucket(bname, ''); this.logger.log(`Bucket created: ${bname}`); }
    catch (err: any) {
      // MinIO reports "already exists" with two possible messages
      if (err.message?.includes('bucket already exists') || err.message?.includes('already own it')) return;
      throw err;
    }
  }

  async removeBucket(bucketName: string, projectSlug?: string, _bucketDisplayName?: string): Promise<void> {
    await this.ensureClient();
    const bname = projectSlug && _bucketDisplayName ? this.buckets.buildBucketName(projectSlug, _bucketDisplayName) : bucketName;
    try { await this.client.removeBucket(bname); }
    catch (err: any) { if (err.message?.includes('does not exist')) return; throw err; }
  }

  async upload(key: string, data: Buffer, mimeType?: string, projectSlug?: string, bucketDisplayName?: string): Promise<UploadResult> {
    await this.ensureClient();
    const bucket = this.buckets.resolveBucket(projectSlug, bucketDisplayName);
    const result = await this.client.putObject(bucket, key, data, { 'Content-Type': mimeType || 'application/octet-stream' });
    return { key, etag: result.etag ?? `"${Buffer.from(`${Date.now()}-${key}`).toString('base64')}"`, size: data.length, mimeType };
  }

  async download(key: string, projectSlug?: string, bucketDisplayName?: string): Promise<Buffer> {
    await this.ensureClient();
    const bucket = this.buckets.resolveBucket(projectSlug, bucketDisplayName);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.client.getObject(bucket, key, (err: any, stream: any) => {
        if (err) return reject(err);
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    });
  }

  async delete(key: string, projectSlug?: string, bucketDisplayName?: string): Promise<void> {
    await this.ensureClient();
    await this.client.removeObject(this.buckets.resolveBucket(projectSlug, bucketDisplayName), key);
  }

  async list(prefix?: string, projectSlug?: string, bucketDisplayName?: string): Promise<string[]> {
    await this.ensureClient();
    const bucket = this.buckets.resolveBucket(projectSlug, bucketDisplayName);
    return new Promise((resolve, reject) => {
      const files: string[] = [];
      const stream = this.client.listObjects(bucket, prefix, true);
      stream.on('data', (obj: any) => files.push(obj.name));
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600, projectSlug?: string, bucketDisplayName?: string): Promise<string> {
    await this.ensureClient();
    const bucket = this.buckets.resolveBucket(projectSlug, bucketDisplayName);
    const url = await this.client.presignedGetObject(bucket, key, expiresInSeconds);
    // Replace internal endpoint with external so the URL works outside the Docker network
    return url.replace(this.internalEndpoint, this.externalEndpoint);
  }

  getExternalUrl(key: string, projectSlug: string, bucketDisplayName: string): string {
    const ext = this.externalEndpoint.replace(/^https?:\/\//, '');
    return `https://${ext}/${this.buckets.buildBucketName(projectSlug, bucketDisplayName)}/${key}`;
  }
}
