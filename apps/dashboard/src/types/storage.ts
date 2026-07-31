// Storage types

export type StorageProviderType = 'internal' | 'cloudinary' | 'telegram' | 's3';

export interface StorageBucket {
  id: string;
  name: string;
  provider: StorageProviderType;
  status: 'active' | 'creating' | 'deleting' | 'error';
  region?: string;
  sizeBytes: number;
  objectCount: number;
  access: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
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

export interface ListFilesOptions {
  prefix?: string;
  page?: number;
  limit?: number;
}

export interface ListFilesResult {
  files: StorageFile[];
  page: number;
  limit: number;
  total: number;
}

// Internal database record — tracks every uploaded file with application linkage
export interface StorageFileRecord {
  id: string;
  projectId: string;
  bucketId: string;
  storageFileId: string;
  key: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes: number;
  url: string;
  provider: StorageProviderType;
  application?: string;
  recordId?: string;
  uploadedBy?: string;
  createdAt: string;
}
