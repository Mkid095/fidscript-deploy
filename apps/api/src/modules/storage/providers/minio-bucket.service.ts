import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioBucketService {
  constructor(private config: ConfigService) {}

  buildBucketName(projectSlug: string, bucketName: string): string {
    const s = projectSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
    const n = bucketName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
    return `proj-${s}-${n}`;
  }

  resolveBucket(projectSlug?: string, bucketDisplayName?: string): string {
    if (projectSlug && bucketDisplayName) return this.buildBucketName(projectSlug, bucketDisplayName);
    return this.config.get<string>('MINIO_BUCKET', 'fidscript');
  }
}
