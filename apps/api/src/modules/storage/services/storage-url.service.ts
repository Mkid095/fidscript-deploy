import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { MinioProvider } from '@/modules/storage/providers/minio.provider';
import { StorageAccessService } from '@/modules/storage/services/storage-access.service';
import { StorageCredentialsService } from '@/modules/storage/services/storage-credentials.service';

@Injectable()
export class StorageUrlService {
  constructor(
    private prisma: PrismaService,
    private providerFactory: StorageProviderFactory,
    private minioProvider: MinioProvider,
    private access: StorageAccessService,
    private credentials: StorageCredentialsService,
  ) {}

  async getPresignedUrl(
    userId: string,
    projectId: string,
    bucketId: string,
    key: string,
    expiresInSeconds = 3600,
  ) {
    await this.access.checkProjectAccess(userId, projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    });
    const bucket = await this.prisma.bucket.findFirst({
      where: { id: bucketId, projectId },
    });
    if (!bucket) throw new NotFoundException('Bucket not found');

    const svc = this.providerFactory.get(bucket.provider);
    const creds = bucket.provider !== 'internal'
      ? await this.credentials.getProjectCredentials(projectId, bucket.provider)
      : undefined;

    return svc.getSignedUrl(key, expiresInSeconds, project?.slug, bucket.name, creds);
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
    const creds = bucket.provider !== 'internal'
      ? await this.credentials.getProjectCredentials(projectId, bucket.provider)
      : undefined;

    return svc.download(key, project?.slug, bucket.name, creds);
  }
}