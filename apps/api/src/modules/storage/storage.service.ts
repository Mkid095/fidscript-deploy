import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventService } from '../../events/event.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { MinioProvider } from './providers/minio.provider.js';
import { CloudinaryProvider } from './providers/cloudinary.provider.js';
import { TelegramProvider } from './providers/telegram.provider.js';
import { StorageProvider } from './providers/storage-provider.interface.js';

@Injectable()
export class StorageService {
  private providers: Map<string, StorageProvider> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
    private auditService: AuditService,
    @Inject(forwardRef(() => MinioProvider)) private minioProvider: MinioProvider,
    @Inject(forwardRef(() => CloudinaryProvider)) private cloudinaryProvider: CloudinaryProvider,
    @Inject(forwardRef(() => TelegramProvider)) private telegramProvider: TelegramProvider,
  ) {
    this.providers.set('internal', this.minioProvider);
    this.providers.set('cloudinary', this.cloudinaryProvider);
    this.providers.set('telegram', this.telegramProvider);
  }

  async createBucket(userId: string, projectId: string, name: string, isPublic = false, provider = 'internal') {
    const bucket = await this.prisma.bucket.create({
      data: {
        projectId,
        name,
        isPublic,
        provider,
      },
    });

    await this.eventService.emit('storage.bucket_created', { bucketId: bucket.id, projectId, name });
    await this.auditService.log({ userId, action: 'bucket.created', resourceType: 'bucket', resourceId: bucket.id });

    return bucket;
  }

  async listBuckets(userId: string, projectId: string) {
    return this.prisma.bucket.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteBucket(userId: string, bucketId: string) {
    const bucket = await this.prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket) throw new NotFoundException('Bucket not found');

    await this.prisma.bucket.delete({ where: { id: bucketId } });

    await this.eventService.emit('storage.bucket_deleted', { bucketId, projectId: bucket.projectId });
    await this.auditService.log({ userId, action: 'bucket.deleted', resourceType: 'bucket', resourceId: bucketId });

    return { success: true };
  }

  async listFiles(userId: string, bucketId: string, prefix?: string, page = 1, limit = 50) {
    const bucket = await this.prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const skip = (page - 1) * limit;
    const where: any = { bucketId };
    if (prefix) {
      where.key = { startsWith: prefix };
    }

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      files,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async uploadFile(userId: string, bucketId: string, key: string, originalName: string, mimeType: string, data: Buffer) {
    const bucket = await this.prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const provider = this.providers.get(bucket.provider);
    if (!provider) throw new Error(`Provider ${bucket.provider} not available`);

    const result = await provider.upload(key, data, mimeType);

    const file = await this.prisma.file.create({
      data: {
        bucketId,
        key,
        originalName,
        mimeType,
        sizeBytes: BigInt(result.size),
        etag: result.etag,
      },
    });

    await this.eventService.emit('storage.file_uploaded', { fileId: file.id, bucketId, key });
    await this.auditService.log({ userId, action: 'file.uploaded', resourceType: 'file', resourceId: file.id });

    return file;
  }

  async deleteFile(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { bucket: true },
    });
    if (!file) throw new NotFoundException('File not found');

    const provider = this.providers.get(file.bucket.provider);
    if (provider) {
      try {
        await provider.delete(file.key);
      } catch (error) {
        console.error(`Failed to delete file from provider: ${error.message}`);
      }
    }

    await this.prisma.file.delete({ where: { id: fileId } });

    await this.eventService.emit('storage.file_deleted', { fileId, bucketId: file.bucketId, key: file.key });
    await this.auditService.log({ userId, action: 'file.deleted', resourceType: 'file', resourceId: fileId });

    return { success: true };
  }

  async getSignedUrl(bucketId: string, key: string, expiresInSeconds = 3600): Promise<string> {
    const bucket = await this.prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const provider = this.providers.get(bucket.provider);
    if (!provider) throw new Error(`Provider ${bucket.provider} not available`);

    return provider.getSignedUrl(key, expiresInSeconds);
  }

  async getPublicUrl(bucketId: string, key: string): Promise<string> {
    const bucket = await this.prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket) throw new NotFoundException('Bucket not found');

    if (bucket.provider === 'internal') {
      const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000');
      return `http://${minioEndpoint}/${bucket.name}/${key}`;
    }

    const provider = this.providers.get(bucket.provider);
    if (!provider) throw new Error(`Provider ${bucket.provider} not available`);

    return provider.getSignedUrl(key, 86400);
  }

  async downloadFile(bucketId: string, key: string): Promise<Buffer> {
    const bucket = await this.prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const provider = this.providers.get(bucket.provider);
    if (!provider) throw new Error(`Provider ${bucket.provider} not available`);

    return provider.download(key);
  }
}
