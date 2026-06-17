import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResult } from './storage-provider.interface';

@Injectable()
export class MinioProvider implements StorageProvider, OnModuleInit {
  name = 'minio';
  private readonly logger = new Logger(MinioProvider.name);
  private client: any = null;

  private internalEndpoint = '';
  private externalEndpoint = '';
  private accessKey = '';
  private secretKey = '';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.internalEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'minio:9000');
    this.externalEndpoint = this.configService.get<string>('MINIO_EXTERNAL_ENDPOINT', this.internalEndpoint);
    this.accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    this.secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    this.initClient();
  }

  private initClient() {
    const [host, port = '9000'] = this.internalEndpoint.split(':');
    import('minio').then(({ Client }) => {
      this.client = new Client({
        endPoint: host,
        port: parseInt(port),
        useSSL: false,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
      });
      this.logger.log(`MinIO client initialized for ${this.internalEndpoint} → external ${this.externalEndpoint}`);
    }).catch(err => {
      this.logger.warn('MinIO client initialization failed: ' + err.message);
    });
  }

  private async ensureClient() {
    if (!this.client) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!this.client) throw new Error('MinIO client not initialized');
    }
  }

  private buildBucketName(projectSlug: string, bucketName: string): string {
    const s = projectSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
    const n = bucketName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
    return `proj-${s}-${n}`;
  }

  async makeBucket(bucketName: string, projectSlug?: string, _bucketDisplayName?: string): Promise<void> {
    await this.ensureClient();
    const bname = projectSlug && _bucketDisplayName
      ? this.buildBucketName(projectSlug, _bucketDisplayName)
      : bucketName;
    try {
      await this.client.makeBucket(bname, '');
      this.logger.log(`Bucket created: ${bname}`);
    } catch (err: any) {
      if (err.message?.includes('Your bucket name is not domain') || err.message?.includes('bucket already exists')) {
        this.logger.debug(`Bucket already exists: ${bname}`);
        return;
      }
      throw err;
    }
  }

  async removeBucket(bucketName: string, projectSlug?: string, _bucketDisplayName?: string): Promise<void> {
    await this.ensureClient();
    const bname = projectSlug && _bucketDisplayName
      ? this.buildBucketName(projectSlug, _bucketDisplayName)
      : bucketName;
    try {
      await this.client.removeBucket(bname);
      this.logger.log(`Bucket removed: ${bname}`);
    } catch (err: any) {
      if (err.message?.includes('The specified bucket does not exist')) return;
      throw err;
    }
  }

  async upload(
    key: string,
    data: Buffer,
    mimeType?: string,
    projectSlug?: string,
    bucketDisplayName?: string,
  ): Promise<UploadResult> {
    await this.ensureClient();
    const bucket = (projectSlug && bucketDisplayName)
      ? this.buildBucketName(projectSlug, bucketDisplayName)
      : this.configService.get<string>('MINIO_BUCKET', 'fidscript');

    const result = await this.client.putObject(bucket, key, data, {
      'Content-Type': mimeType || 'application/octet-stream',
    });

    return {
      key,
      etag: result.etag ?? `"${Buffer.from(`${Date.now()}-${key}`).toString('base64')}"`,
      size: data.length,
      mimeType,
    };
  }

  async download(key: string, projectSlug?: string, bucketDisplayName?: string): Promise<Buffer> {
    await this.ensureClient();
    const bucket = (projectSlug && bucketDisplayName)
      ? this.buildBucketName(projectSlug, bucketDisplayName)
      : this.configService.get<string>('MINIO_BUCKET', 'fidscript');

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
    const bucket = (projectSlug && bucketDisplayName)
      ? this.buildBucketName(projectSlug, bucketDisplayName)
      : this.configService.get<string>('MINIO_BUCKET', 'fidscript');
    await this.client.removeObject(bucket, key);
  }

  async list(prefix?: string, projectSlug?: string, bucketDisplayName?: string): Promise<string[]> {
    await this.ensureClient();
    const bucket = (projectSlug && bucketDisplayName)
      ? this.buildBucketName(projectSlug, bucketDisplayName)
      : this.configService.get<string>('MINIO_BUCKET', 'fidscript');

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
    const bucket = (projectSlug && bucketDisplayName)
      ? this.buildBucketName(projectSlug, bucketDisplayName)
      : this.configService.get<string>('MINIO_BUCKET', 'fidscript');
    return this.client.presignedGetObject(bucket, key, expiresInSeconds);
  }

  /**
   * Build an external URL for a public object.
   * Uses MINIO_EXTERNAL_ENDPOINT so clients never see localhost.
   */
  getExternalUrl(key: string, projectSlug: string, bucketDisplayName: string): string {
    const ext = this.externalEndpoint.replace(/^https?:\/\//, '');
    const bucket = this.buildBucketName(projectSlug, bucketDisplayName);
    return `https://${ext}/${bucket}/${key}`;
  }
}