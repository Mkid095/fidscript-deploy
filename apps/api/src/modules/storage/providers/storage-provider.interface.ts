// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProviderCredentials = any;

export interface ConnectionTestResult {
  ok: boolean;
  /** Provider-specific details on success (e.g. cloud name, bot username). */
  detail?: string;
  /** Human-readable error message on failure. */
  error?: string;
}

export interface StorageProvider {
  name: string;
  /**
   * Lightweight credential check — performs the cheapest possible API call to
   * confirm the supplied credentials authenticate. Does NOT mutate any state.
   * Must NOT throw on bad credentials; return `{ ok: false, error }` instead.
   */
  testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult>;
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
