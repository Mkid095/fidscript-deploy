// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProviderCredentials = any;

export interface StorageProvider {
  name: string;
  makeBucket(bucketName: string, projectSlug?: string, bucketDisplayName?: string): Promise<void>;
  removeBucket(bucketName: string, projectSlug?: string, bucketDisplayName?: string): Promise<void>;
  upload(
    key: string,
    data: Buffer,
    mimeType?: string,
    projectSlug?: string,
    bucketDisplayName?: string,
    credentials?: ProviderCredentials,
  ): Promise<UploadResult>;
  download(
    key: string,
    projectSlug?: string,
    bucketDisplayName?: string,
    credentials?: ProviderCredentials,
  ): Promise<Buffer>;
  delete(
    key: string,
    projectSlug?: string,
    bucketDisplayName?: string,
    credentials?: ProviderCredentials,
  ): Promise<void>;
  list(
    prefix?: string,
    projectSlug?: string,
    bucketDisplayName?: string,
    credentials?: ProviderCredentials,
  ): Promise<string[]>;
  getSignedUrl(
    key: string,
    expiresInSeconds?: number,
    projectSlug?: string,
    bucketDisplayName?: string,
    credentials?: ProviderCredentials,
  ): Promise<string>;
}

export interface UploadResult {
  key: string;
  etag: string;
  size: number;
  mimeType?: string;
}
