export interface StorageProvider {
  name: string;
  upload(key: string, data: Buffer, mimeType?: string): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export interface UploadResult {
  key: string;
  etag: string;
  size: number;
  mimeType?: string;
}
