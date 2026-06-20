import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { StorageAccessService } from '@/modules/storage/services/storage-access.service';
import { StorageCredentialsService } from '@/modules/storage/services/storage-credentials.service';
import * as crypto from 'crypto';

@Injectable()
export class StorageFileService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private providerFactory: StorageProviderFactory,
    private access: StorageAccessService,
    private credentials: StorageCredentialsService,
  ) {}

  async uploadFile(
    userId: string,
    projectId: string,
    bucketId: string,
    key: string,
    originalName: string,
    mimeType: string,
    data: Buffer,
  ) {
    const project = await this.access.checkProjectAccess(userId, projectId);

    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const svc = this.providerFactory.get(bucket.provider);
    const creds = bucket.provider !== 'internal'
      ? await this.credentials.getProjectCredentials(projectId, bucket.provider)
      : undefined;

    const result = await svc.upload(
      key, data, mimeType,
      project.slug, bucket.name,
      creds,
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

    return {
      ...file,
      sizeBytes: Number(file.sizeBytes),
    };
  }

  async listFiles(
    userId: string,
    projectId: string,
    bucketId: string,
    prefix?: string,
    page = 1,
    limit = 50,
  ) {
    await this.access.checkProjectAccess(userId, projectId);

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

    return {
      files: files.map(f => ({ ...f, sizeBytes: Number(f.sizeBytes) })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async deleteFile(userId: string, projectId: string, fileId: string) {
    const project = await this.access.checkProjectAccess(userId, projectId);

    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { bucket: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (file.bucket.projectId !== projectId) throw new ForbiddenException('Access denied');

    const svc = this.providerFactory.get(file.bucket.provider);
    const creds = file.bucket.provider !== 'internal'
      ? await this.credentials.getProjectCredentials(projectId, file.bucket.provider)
      : undefined;

    await svc.delete(file.key, project.slug, file.bucket.name, creds);
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
}