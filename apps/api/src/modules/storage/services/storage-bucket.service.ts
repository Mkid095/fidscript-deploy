import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { StorageAccessService } from '@/modules/storage/services/storage-access.service';
import { StorageCredentialsService } from '@/modules/storage/services/storage-credentials.service';
import * as crypto from 'crypto';

@Injectable()
export class StorageBucketService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private providerFactory: StorageProviderFactory,
    private access: StorageAccessService,
    private credentials: StorageCredentialsService,
  ) {}

  async createBucket(
    userId: string,
    projectId: string,
    name: string,
    isPublic = false,
    provider = 'internal',
  ) {
    const project = await this.access.checkProjectAccess(userId, projectId);

    const existing = await this.prisma.bucket.findFirst({
      where: { projectId, name, provider },
    });
    if (existing) throw new ForbiddenException('Bucket with this name already exists');

    // Verify credentials are available for third-party providers
    if (provider !== 'internal') {
      const creds = await this.credentials.getProjectCredentials(projectId, provider);
      if (!creds) throw new ForbiddenException(`No credentials configured for provider '${provider}' in project settings`);
    }

    const svc = this.providerFactory.get(provider);
    await svc.makeBucket(name, project.slug, name);

    const bucket = await this.prisma.bucket.create({
      data: { projectId, name, provider, isPublic },
    });

    await this.eventService.emit('storage.bucket.created', projectId, {
      name,
      provider,
    });

    return bucket;
  }

  async listBuckets(userId: string, projectId: string) {
    await this.access.checkProjectAccess(userId, projectId);
    return this.prisma.bucket.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteBucket(userId: string, projectId: string, bucketId: string) {
    const project = await this.access.checkProjectAccess(userId, projectId);

    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    // Check not empty
    const count = await this.prisma.file.count({ where: { bucketId } });
    if (count > 0) throw new ForbiddenException('Bucket is not empty — delete all files first');

    await this.prisma.bucket.delete({ where: { id: bucketId } });

    const svc = this.providerFactory.get(bucket.provider);
    await svc.removeBucket(bucket.name, project.slug, bucket.name);

    await this.eventService.emit('storage.bucket.deleted', projectId, {
      name: bucket.name,
      provider: bucket.provider,
    });

    return { success: true };
  }
}