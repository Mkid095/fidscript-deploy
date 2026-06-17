import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { MinioProvider } from './providers/minio.provider';
import { StorageProviderFactory } from './providers/storage-provider.factory';
import { CloudinaryCredentials } from './providers/cloudinary.provider';
import { TelegramCredentials } from './providers/telegram.provider';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private minioProvider: MinioProvider,
    private providerFactory: StorageProviderFactory,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private async checkProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, ownerId: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const isOwner = project.ownerId === userId;
    const isMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!isOwner && !isMember) throw new ForbiddenException('Access denied');

    return project;
  }

  private async getProjectCredentials(projectId: string, provider: string): Promise<any> {
    const envVars = await this.prisma.projectEnv.findMany({ where: { projectId } });

    const decrypt = (ciphertext: string): string => {
      // Lazy-import CryptoService to avoid circular dependency
      try {
        const { CryptoService } = require('../crypto/crypto.service');
        // crypto is a module-level singleton — decrypt inline
        const parts = ciphertext.split(':');
        if (parts.length !== 3) throw new Error('Invalid ciphertext');
        const { createDecipheriv, randomBytes } = require('crypto');
        const keyBase64 = process.env.ENCRYPTION_KEY || require('fs').readFileSync(
          process.env.ENCRYPTION_KEY_FILE || '', 'utf8'
        ).trim();
        const key = Buffer.from(keyBase64, 'base64');
        const decipher = createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(parts[0], 'base64'),
        );
        decipher.setAuthTag(Buffer.from(parts[1], 'base64'));
        return decipher.update(Buffer.from(parts[2], 'base64'), '', 'utf8') + decipher.final('utf8');
      } catch {
        return ciphertext; // fallback: treat as plaintext (dev only)
      }
    };

    if (provider === 'cloudinary') {
      const cloudNameVar = envVars.find(e => e.key === 'CLOUDINARY_CLOUD_NAME');
      const apiKeyVar = envVars.find(e => e.key === 'CLOUDINARY_API_KEY');
      const apiSecretVar = envVars.find(e => e.key === 'CLOUDINARY_API_SECRET');
      if (!cloudNameVar || !apiKeyVar || !apiSecretVar) return undefined;
      return {
        cloudName: decrypt(cloudNameVar.value),
        apiKey: decrypt(apiKeyVar.value),
        apiSecret: decrypt(apiSecretVar.value),
      } as CloudinaryCredentials;
    }

    if (provider === 'telegram') {
      const botTokenVar = envVars.find(e => e.key === 'TELEGRAM_BOT_TOKEN');
      const chatIdVar = envVars.find(e => e.key === 'TELEGRAM_CHAT_ID');
      if (!botTokenVar || !chatIdVar) return undefined;
      return {
        botToken: decrypt(botTokenVar.value),
        chatId: decrypt(chatIdVar.value),
      } as TelegramCredentials;
    }

    return undefined;
  }

  // ─────────────────────────────────────────────────────────────
  // Buckets
  // ─────────────────────────────────────────────────────────────

  async createBucket(
    userId: string,
    projectId: string,
    name: string,
    isPublic = false,
    provider = 'internal',
  ) {
    const project = await this.checkProjectAccess(userId, projectId);

    const existing = await this.prisma.bucket.findFirst({
      where: { projectId, name, provider },
    });
    if (existing) throw new ForbiddenException('Bucket with this name already exists');

    // Verify credentials are available for third-party providers
    if (provider !== 'internal') {
      const creds = await this.getProjectCredentials(projectId, provider);
      if (!creds) throw new ForbiddenException(`No credentials configured for provider '${provider}' in project settings`);
    }

    const svc = this.providerFactory.get(provider);
    await svc.makeBucket(name);

    const bucket = await this.prisma.bucket.create({
      data: { projectId, name, provider, isPublic },
    });

    await this.eventService.emit('storage.bucket.created', {
      id: crypto.randomUUID(),
      type: 'storage.bucket.created',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'bucket',
      resourceId: bucket.id,
      metadata: { projectId, name, provider },
    });

    return bucket;
  }

  async listBuckets(userId: string, projectId: string) {
    await this.checkProjectAccess(userId, projectId);
    return this.prisma.bucket.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteBucket(userId: string, projectId: string, bucketId: string) {
    const project = await this.checkProjectAccess(userId, projectId);

    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    // Check not empty
    const count = await this.prisma.file.count({ where: { bucketId } });
    if (count > 0) throw new ForbiddenException('Bucket is not empty — delete all files first');

    await this.prisma.bucket.delete({ where: { id: bucketId } });

    const svc = this.providerFactory.get(bucket.provider);
    await svc.removeBucket(bucket.name);

    await this.eventService.emit('storage.bucket.deleted', {
      id: crypto.randomUUID(),
      type: 'storage.bucket.deleted',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'bucket',
      resourceId: bucketId,
      metadata: { projectId, name: bucket.name, provider: bucket.provider },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Files
  // ─────────────────────────────────────────────────────────────

  async uploadFile(
    userId: string,
    projectId: string,
    bucketId: string,
    key: string,
    originalName: string,
    mimeType: string,
    data: Buffer,
  ) {
    const project = await this.checkProjectAccess(userId, projectId);

    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const svc = this.providerFactory.get(bucket.provider);
    const credentials = bucket.provider !== 'internal'
      ? await this.getProjectCredentials(projectId, bucket.provider)
      : undefined;

    const result = await svc.upload(
      key, data, mimeType,
      project.slug, bucket.name,
      credentials,
    );

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

    await this.eventService.emit('storage.file.uploaded', {
      id: crypto.randomUUID(),
      type: 'storage.file.uploaded',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'file',
      resourceId: file.id,
      metadata: { projectId, bucketId, key, etag: result.etag },
    });

    return file;
  }

  async listFiles(
    userId: string,
    projectId: string,
    bucketId: string,
    prefix?: string,
    page = 1,
    limit = 50,
  ) {
    await this.checkProjectAccess(userId, projectId);

    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const skip = (page - 1) * limit;
    const where: any = { bucketId };
    if (prefix) where.key = { startsWith: prefix };

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.file.count({ where }),
    ]);

    return { files, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async deleteFile(userId: string, projectId: string, fileId: string) {
    const project = await this.checkProjectAccess(userId, projectId);

    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { bucket: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (file.bucket.projectId !== projectId) throw new ForbiddenException('Access denied');

    const svc = this.providerFactory.get(file.bucket.provider);
    const credentials = file.bucket.provider !== 'internal'
      ? await this.getProjectCredentials(projectId, file.bucket.provider)
      : undefined;

    await svc.delete(file.key, project.slug, file.bucket.name, credentials);
    await this.prisma.file.delete({ where: { id: fileId } });

    await this.eventService.emit('storage.file.deleted', {
      id: crypto.randomUUID(),
      type: 'storage.file.deleted',
      timestamp: new Date(),
      actorId: userId,
      actorType: 'user',
      resourceType: 'file',
      resourceId: fileId,
      metadata: { projectId, bucketId: file.bucketId, key: file.key },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Query helpers (used by controller)
  // ─────────────────────────────────────────────────────────────

  async getProjectSlug(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project.slug;
  }

  async getBucketName(bucketId: string): Promise<string> {
    const bucket = await this.prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket) throw new NotFoundException('Bucket not found');
    return bucket.name;
  }

  // ─────────────────────────────────────────────────────────────
  // URLs
  // ─────────────────────────────────────────────────────────────

  async getPresignedUrl(
    userId: string,
    projectId: string,
    bucketId: string,
    key: string,
    expiresInSeconds = 3600,
  ) {
    await this.checkProjectAccess(userId, projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    });
    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const svc = this.providerFactory.get(bucket.provider);
    const credentials = bucket.provider !== 'internal'
      ? await this.getProjectCredentials(projectId, bucket.provider)
      : undefined;

    return svc.getSignedUrl(key, expiresInSeconds, project?.slug, bucket.name, credentials);
  }

  getPublicUrl(projectSlug: string, bucketName: string, key: string): string {
    return this.minioProvider.getExternalUrl(key, projectSlug, bucketName);
  }

  async downloadFile(projectId: string, bucketId: string, key: string): Promise<Buffer> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    });
    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const svc = this.providerFactory.get(bucket.provider);
    const credentials = bucket.provider !== 'internal'
      ? await this.getProjectCredentials(projectId, bucket.provider)
      : undefined;

    return svc.download(key, project?.slug, bucket.name, credentials);
  }
}
