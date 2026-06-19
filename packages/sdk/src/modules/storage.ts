import { FidscriptClient } from '../client';

export interface Bucket {
  id: string;
  name: string;
  provider: string;
  status: string;
  createdAt: string;
}

export interface StorageFile {
  id: string;
  key: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes: number;
  etag: string;
  createdAt: string;
}

export class StorageModule {
  constructor(private client: FidscriptClient) {}

  async listBuckets(projectId: string) {
    const res = await this.client.get<{ buckets: Bucket[] }>(`/api/v1/projects/${projectId}/storage/buckets`);
    return res.buckets;
  }

  async createBucket(projectId: string, name: string, provider = 'internal') {
    return this.client.post<Bucket>(`/api/v1/projects/${projectId}/storage/buckets`, { name, provider });
  }

  async deleteBucket(projectId: string, bucketId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/storage/buckets/${bucketId}`);
  }

  async uploadFile(
    projectId: string,
    bucketId: string,
    file: Buffer | Blob,
    name: string,
    options?: { contentType?: string },
  ) {
    const form = new FormData();
    const blob = file instanceof Buffer ? new Blob([file]) : file;
    form.append('file', blob, name);
    if (options?.contentType) form.append('contentType', options.contentType);
    return this.client.post<StorageFile>(
      `/api/v1/projects/${projectId}/storage/buckets/${bucketId}/files`,
      form,
    );
  }

  async listFiles(projectId: string, bucketId: string) {
    const res = await this.client.get<{ files: StorageFile[] }>(
      `/api/v1/projects/${projectId}/storage/buckets/${bucketId}/files`,
    );
    return res.files;
  }

  async getFile(projectId: string, bucketId: string, fileId: string) {
    return this.client.get<StorageFile>(`/api/v1/projects/${projectId}/storage/buckets/${bucketId}/files/${fileId}`);
  }

  async deleteFile(projectId: string, bucketId: string, fileId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/storage/buckets/${bucketId}/files/${fileId}`);
  }

  async getSignedUrl(projectId: string, bucketId: string, fileId: string, expiresIn = 3600) {
    const res = await this.client.get<{ url: string }>(
      `/api/v1/projects/${projectId}/storage/buckets/${bucketId}/files/${fileId}/url`,
      { expiresIn },
    );
    return res.url;
  }
}
