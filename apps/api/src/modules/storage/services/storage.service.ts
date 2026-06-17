import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageBucketService } from '@/modules/storage/services/storage-bucket.service';
import { StorageFileService } from '@/modules/storage/services/storage-file.service';
import { StorageUrlService } from '@/modules/storage/services/storage-url.service';

@Injectable()
export class StorageService {
  constructor(
    private prisma: PrismaService,
    private buckets: StorageBucketService,
    private files: StorageFileService,
    private urls: StorageUrlService,
  ) {}

  // Buckets
  createBucket(userId: string, projectId: string, name: string, isPublic?: boolean, provider?: string) {
    return this.buckets.createBucket(userId, projectId, name, isPublic, provider);
  }
  listBuckets(userId: string, projectId: string) {
    return this.buckets.listBuckets(userId, projectId);
  }
  deleteBucket(userId: string, projectId: string, bucketId: string) {
    return this.buckets.deleteBucket(userId, projectId, bucketId);
  }

  // Files
  uploadFile(userId: string, projectId: string, bucketId: string, key: string, originalName: string, mimeType: string, data: Buffer) {
    return this.files.uploadFile(userId, projectId, bucketId, key, originalName, mimeType, data);
  }
  listFiles(userId: string, projectId: string, bucketId: string, prefix?: string, page?: number, limit?: number) {
    return this.files.listFiles(userId, projectId, bucketId, prefix, page, limit);
  }
  deleteFile(userId: string, projectId: string, fileId: string) {
    return this.files.deleteFile(userId, projectId, fileId);
  }

  // URLs
  async getPresignedUrl(userId: string, projectId: string, bucketId: string, key: string, expiresInSeconds?: number) {
    return this.urls.getPresignedUrl(userId, projectId, bucketId, key, expiresInSeconds);
  }
  getPublicUrl(projectSlug: string, bucketName: string, key: string): string {
    return this.urls.getPublicUrl(projectSlug, bucketName, key);
  }
  downloadFile(projectId: string, bucketId: string, key: string): Promise<Buffer> {
    return this.urls.downloadFile(projectId, bucketId, key);
  }

  // Query helpers (used by controller)
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
}