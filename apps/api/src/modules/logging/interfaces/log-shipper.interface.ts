export interface LogShipperConfig {
  enabled: boolean;
  type: 'webhook' | 'minio';
  url?: string;
  secret?: string;   // HMAC-SHA256 signing key for webhook
  bucket?: string;   // MinIO bucket name
}

export interface SerializedLogEntry {
  id: string;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string; // ISO-8601
}

export interface LogBatch {
  projectId: string;
  streamId: string;
  streamName: string;
  entries: SerializedLogEntry[];
  shippedAt: string; // ISO-8601
}

/**
 * Phase 15 — pluggable log shipper interface.
 * Implementations: WebhookShipper, MinioShipper.
 */
export interface LogShipper {
  readonly type: string;
  deliver(batch: LogBatch, config: LogShipperConfig): Promise<void>;
}
