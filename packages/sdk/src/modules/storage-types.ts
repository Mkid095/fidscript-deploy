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

export type StorageProvider = 'cloudinary' | 'telegram' | 'internal';
