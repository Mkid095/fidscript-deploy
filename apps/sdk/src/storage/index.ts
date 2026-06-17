import { AxiosInstance } from 'axios';
import { StorageFile } from '../index.js';

export class StorageModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async listBuckets(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/storage/buckets`);
    return response.data.buckets;
  }

  async createBucket(projectId: string, name: string, provider?: string) {
    const response = await this.client.post(`/projects/${projectId}/storage/buckets`, { name, provider });
    return response.data;
  }

  async deleteBucket(projectId: string, bucketId: string) {
    const response = await this.client.delete(`/projects/${projectId}/storage/buckets/${bucketId}`);
    return response.data;
  }

  async uploadFile(projectId: string, bucketId: string, file: Buffer | Blob, name: string, options?: { contentType?: string }) {
    const formData = new FormData();
    const blob = file instanceof Blob ? file : new Blob([new Uint8Array(file)]);
    formData.append('file', blob, name);
    if (options?.contentType) {
      formData.append('contentType', options.contentType);
    }

    const response = await this.client.post(
      `/projects/${projectId}/storage/buckets/${bucketId}/files`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data as StorageFile;
  }

  async listFiles(projectId: string, bucketId: string) {
    const response = await this.client.get(`/projects/${projectId}/storage/buckets/${bucketId}/files`);
    return response.data.files as StorageFile[];
  }

  async getFile(projectId: string, bucketId: string, fileId: string) {
    const response = await this.client.get(`/projects/${projectId}/storage/buckets/${bucketId}/files/${fileId}`);
    return response.data as StorageFile;
  }

  async deleteFile(projectId: string, bucketId: string, fileId: string) {
    const response = await this.client.delete(`/projects/${projectId}/storage/buckets/${bucketId}/files/${fileId}`);
    return response.data;
  }

  async getSignedUrl(projectId: string, bucketId: string, fileId: string, expiresIn = 3600) {
    const response = await this.client.get(`/projects/${projectId}/storage/buckets/${bucketId}/files/${fileId}/url`, {
      params: { expiresIn },
    });
    return response.data.url;
  }
}