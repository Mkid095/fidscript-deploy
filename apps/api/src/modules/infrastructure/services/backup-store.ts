/**
 * BackupStore — where the platform's own backups go.
 *
 * Two kinds of destination:
 *
 *  - `internal` — the platform's own MinIO. The default; it exists on
 *    every install and needs no configuration, but it lives on the same
 *    server as the data it protects.
 *  - `s3` — any S3-compatible endpoint: Wasabi, Backblaze B2, Cloudflare
 *    R2, or another MinIO on a different machine. Same `minio` client,
 *    pointed elsewhere. Configured by a platform admin; stored encrypted
 *    as a platform-level Secret row.
 *
 * An off-server destination is the difference between "the archive
 * exists" and "the archive outlives the machine it was made on".
 */
import { MinioProvider } from '@/modules/storage/providers/minio.provider';

export type BackupStoreKind = 'internal' | 's3';

/** What the S3-compatible destination is pointed at. */
export interface S3DestinationConfig {
  /** Host:port or host of the endpoint, e.g. `wasabi.s3.eu-central-1.wasabisys.com:443`. */
  endpoint: string;
  region?: string;
  accessKey: string;
  secretKey: string;
  /** The bucket the backups land in. Created on the first run if missing. */
  bucket: string;
  /** Default true; R2 and friends use https, a LAN MinIO may be http. */
  useSsl?: boolean;
}

/**
 * The surface a backup needs from its destination: the raw objects, in
 * the bucket that holds the platform's own dumps.
 */
export interface BackupStore {
  readonly kind: BackupStoreKind;
  /** A short, human description for the console. */
  readonly description: string;

  makeBucket(): Promise<void>;
  upload(key: string, data: Buffer): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;

  /** A cheap, authenticated probe — "can these credentials do anything?". */
  testConnection(): Promise<{ ok: boolean; detail?: string; error?: string }>;
}

/** The internal bucket — fixed, because the platform's files live there. */
export const BACKUP_BUCKET = 'backups-platform';

/**
 * The platform's own MinIO, in its platform bucket. The fallback
 * destination, and the one every install has.
 */
export class InternalMinioStore implements BackupStore {
  readonly kind = 'internal' as const;
  readonly description = `the platform's own MinIO (${BACKUP_BUCKET}) — on the same machine as the data`;

  constructor(private minio: MinioProvider) {}

  async makeBucket(): Promise<void> {
    try {
      await this.minio.makeBucket(BACKUP_BUCKET);
    } catch (err: unknown) {
      // MinIO reports "already exists" with two possible messages.
      if (err instanceof Error && /already exists|already own it/i.test(err.message)) return;
      throw err;
    }
  }

  async upload(key: string, data: Buffer): Promise<void> {
    await this.minio.upload(key, data, 'application/octet-stream', undefined, BACKUP_BUCKET);
  }

  download(key: string): Promise<Buffer> {
    return this.minio.download(key, undefined, BACKUP_BUCKET);
  }

  delete(key: string): Promise<void> {
    return this.minio.delete(key, undefined, BACKUP_BUCKET);
  }

  list(prefix: string): Promise<string[]> {
    return this.minio.list(prefix, undefined, BACKUP_BUCKET);
  }

  async testConnection(): Promise<{ ok: boolean; detail?: string; error?: string }> {
    return this.minio.testConnection();
  }
}

/**
 * The same minio client, aimed at an S3-compatible endpoint that is not
 * the platform's own MinIO. Built per-call from the admin's configuration,
 * so a change of destination takes effect on the next run with no restart.
 */
export class S3Store implements BackupStore {
  readonly kind = 's3' as const;
  readonly description: string;
  private client: any = null;

  constructor(readonly config: S3DestinationConfig) {
    this.description = `S3-compatible at ${config.endpoint}, bucket ${config.bucket}`;
  }

  private async clientReady() {
    if (!this.client) {
      const { Client } = await import('minio');
      const [host, port] = S3Store.splitEndpoint(this.config.endpoint);
      this.client = new Client({
        endPoint: host,
        port,
        // An https:// scheme means ssl on even if the flag was not set.
        useSSL: this.config.useSsl ?? S3Store.schemeIsHttps(this.config.endpoint),
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
        region: this.config.region,
      });
    }
    return this.client;
  }

  static splitEndpoint(endpoint: string): [string, number | undefined] {
    const bare = endpoint.replace(/^https?:\/\//i, '');
    const [host, port] = bare.split(':');
    return [host, port ? Number(port) : undefined];
  }

  /**
   * SSL is on unless the endpoint says `http://` outright — R2, Wasabi and
   * Backblaze are https; a same-datacenter MinIO may be http, and that is
   * the one place the scheme is written down.
   */
  static schemeIsHttps(endpoint: string): boolean {
    return !/^http:\/\//i.test(endpoint);
  }

  async makeBucket(): Promise<void> {
    const client = await this.clientReady();
    try {
      await client.makeBucket(this.config.bucket, '');
    } catch (err: unknown) {
      if (err instanceof Error && /already exists|BucketAlreadyOwnedByYou|BucketAlreadyExists/i.test(err.message)) return;
      throw err;
    }
  }

  async upload(key: string, data: Buffer): Promise<void> {
    const client = await this.clientReady();
    await client.putObject(this.config.bucket, key, data, {
      'Content-Type': 'application/octet-stream',
    });
  }

  async download(key: string): Promise<Buffer> {
    const client = await this.clientReady();
    const stream = await client.getObject(this.config.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    const client = await this.clientReady();
    await client.removeObject(this.config.bucket, key);
  }

  async list(prefix: string): Promise<string[]> {
    const client = await this.clientReady();
    const files: string[] = [];
    for await (const obj of client.listObjects(this.config.bucket, prefix, true)) {
      files.push(obj.name);
    }
    return files;
  }

  async testConnection(): Promise<{ ok: boolean; detail?: string; error?: string }> {
    try {
      // Listing the destination bucket — one object, no writes — is the
      // cheapest probe that still exercises the credentials and the
      // network path.
      const client = await this.clientReady();
      await this.list('manifests/');
      return { ok: true, detail: this.description };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (/NoSuchBucket/i.test(message)) {
        return {
          ok: true,
          detail: `${this.description} — the bucket ${this.config.bucket} does not exist yet; the first backup creates it.`,
        };
      }
      if (/AccessDenied|InvalidAccessKeyId|SignatureDoesNotMatch/i.test(message)) {
        return { ok: false, error: 'The access key or secret was rejected.' };
      }
      if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|getaddrinfo/i.test(message)) {
        return { ok: false, error: `Cannot reach ${this.config.endpoint}.` };
      }
      return { ok: false, error: message };
    }
  }
}

/**
 * The destination an admin has configured, out of its Secret row.
 *
 * The value is the encrypted JSON of an S3DestinationConfig. Anything that
 * is not a complete, parseable configuration means "use the internal
 * store" — a half-saved destination must not stop the nightly backup
 * running, and the internal store always exists.
 */
export function parseS3Destination(raw: string): S3DestinationConfig | null {
  try {
    const cfg = JSON.parse(raw) as Partial<S3DestinationConfig>;
    if (
      typeof cfg.endpoint !== 'string' ||
      cfg.endpoint.length === 0 ||
      typeof cfg.accessKey !== 'string' ||
      cfg.accessKey.length === 0 ||
      typeof cfg.secretKey !== 'string' ||
      cfg.secretKey.length === 0 ||
      typeof cfg.bucket !== 'string' ||
      cfg.bucket.length === 0
    ) {
      return null;
    }
    return {
      endpoint: cfg.endpoint,
      region: cfg.region,
      accessKey: cfg.accessKey,
      secretKey: cfg.secretKey,
      bucket: cfg.bucket,
      useSsl: cfg.useSsl,
    };
  } catch {
    return null;
  }
}

export function buildS3Store(raw: string): S3Store | null {
  const cfg = parseS3Destination(raw);
  return cfg ? new S3Store(cfg) : null;
}
