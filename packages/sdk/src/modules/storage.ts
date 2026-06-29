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

export interface ProjectStorageConfig {
  id: string;
  projectId: string;
  defaultProvider: string;
  cloudinaryCredsSet: boolean;
  telegramCredsSet: boolean;
  createdAt: string;
  updatedAt: string;
}

export class StorageModule {
  constructor(private client: FidscriptClient) {}

  // ── Config ────────────────────────────────────────────────

  async getStorageConfig(projectId: string): Promise<ProjectStorageConfig> {
    return this.client.get<ProjectStorageConfig>(`/api/v1/projects/${projectId}/storage/config`);
  }

  async updateStorageConfig(projectId: string, data: { defaultProvider?: string }): Promise<ProjectStorageConfig> {
    return this.client.patch<ProjectStorageConfig>(`/api/v1/projects/${projectId}/storage/config`, data);
  }

  // ── Credentials ───────────────────────────────────────────

  async setCloudinaryCredentials(
    projectId: string,
    creds: { cloudName: string; apiKey: string; apiSecret: string },
  ): Promise<ProjectStorageConfig> {
    return this.client.post<ProjectStorageConfig>(
      `/api/v1/projects/${projectId}/storage/credentials/cloudinary`,
      creds,
    );
  }

  async setTelegramCredentials(
    projectId: string,
    creds: { botToken: string; chatId: string },
  ): Promise<ProjectStorageConfig> {
    return this.client.post<ProjectStorageConfig>(
      `/api/v1/projects/${projectId}/storage/credentials/telegram`,
      creds,
    );
  }

  async deleteCredentials(projectId: string, provider: 'cloudinary' | 'telegram'): Promise<ProjectStorageConfig> {
    return this.client.delete<ProjectStorageConfig>(
      `/api/v1/projects/${projectId}/storage/credentials/${provider}`,
    );
  }

  // ── Buckets ────────────────────────────────────────────────

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

  // ── Files ─────────────────────────────────────────────────

  async uploadFile(
    projectId: string,
    bucketId: string,
    file: Buffer | Blob,
    name: string,
    options?: { contentType?: string; key?: string },
  ) {
    const form = new FormData();
    const blob = file instanceof Buffer ? new Blob([file]) : file;
    form.append('file', blob, name);
    if (options?.contentType) form.append('contentType', options.contentType);
    if (options?.key) form.append('key', options.key);
    return this.client.post<StorageFile>(
      `/api/v1/projects/${projectId}/storage/buckets/${bucketId}/files`,
      form,
    );
  }

  async listFiles(
    projectId: string,
    bucketId: string,
    options?: { prefix?: string; page?: number; limit?: number },
  ) {
    const params = new URLSearchParams();
    if (options?.prefix) params.set('prefix', options.prefix);
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    const qs = params.toString();
    const url = `/api/v1/projects/${projectId}/storage/buckets/${bucketId}/files${qs ? `?${qs}` : ''}`;
    return this.client.get<{ files: StorageFile[] }>(url);
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