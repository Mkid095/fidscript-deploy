// Local type definitions mirroring the SDK's internal types.
// These are derived from the SDK's module interfaces and must stay in sync.

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  credentials?: Array<{ type: 'PASSWORD' | 'MAGIC_CODE' | 'PASSKEY' }>;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  ownerId: string;
  role?: string; // 'owner' | 'admin' | 'developer' | 'viewer'
  description?: string;
  lastActivityAt?: string;
  lastDeployAt?: string;
  region?: string;
  deploymentStrategy?: string;
  subdomain?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ProjectMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface EnvVar {
  key: string;
  value: string;
  encrypted: boolean;
}

export interface Deployment {
  id: string;
  projectId: string;
  releaseId: string | null;
  status: string;
  deploymentUrl: string | null;
  rolledBackToId: string | null;
  createdAt: string;
  completedAt: string | null;
  version?: string;
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  imageTag?: string;
  sourceUrl?: string;
  sourceType?: 'git' | 'archive';
  createdBy?: string;
}

export interface Function_ {
  id: string;
  name: string;
  runtime: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BUILDING' | 'DEPLOYING' | 'FAILED' | string;
  projectId?: string;
  createdAt: string;
  currentVersion?: string;
  envVars?: Record<string, string>;
  memoryMb?: number;
  timeoutSeconds?: number;
  entryPoint?: string;
  settings?: Record<string, unknown>;
  invokedCount?: number;
  avgDuration?: number;
  lastInvokedAt?: string | null;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}

// Queue types
export interface Queue {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface QueueMessage {
  id: string;
  body: string;
  status: string;
  attempts: number;
  createdAt: string;
}

// Cron types
export interface CronJob {
  id: string;
  projectId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  targetType?: string;
  endpoint?: string;
  functionId?: string;
  payload?: Record<string, unknown>;
  enabled: boolean;
  retryAttempts: number;
  retryDelaySeconds: number;
  timeoutSeconds: number;
  lastRunAt?: string;
  nextRunAt?: string;
  state: 'idling' | 'scheduled' | 'running' | 'completed' | 'failed' | 'dead';
  createdAt: string;
  updatedAt: string;
}

export interface CronJobRun {
  id: string;
  cronJobId: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  attempt: number;
  scheduledAt: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  statusReason?: string;
  failureType?: 'none' | 'timeout' | 'network_error' | 'invalid_payload' | 'dependency_failure' | 'system_error';
  payloadSnapshot?: Record<string, unknown>;
  replayedFromRunId?: string;
  leaseUntil?: string;
  heartbeatAt?: string;
  executionReason?: 'scheduled' | 'retry' | 'manual' | 'deduplicated' | 'lease_recovery';
  createdAt: string;
}

export interface CronJobStats {
  total: number;
  completed: number;
  failed: number;
  successRate: number | null;
  avgDurationMs: number | null;
  sparkline: { status: string; durationMs: number | null }[];
}

// Monitoring types
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  durationSeconds: number;
  severity: string;
  channels: string[];
  enabled: boolean;
}

export interface Alert {
  id: string;
  severity: string;
  status: 'pending' | 'firing' | 'resolved';
  message: string;
  firstTriggeredAt?: string;
  firedAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, string>;
}

// ─── Database types ────────────────────────────────────────────────────────────

export type DatabaseStatusValue = 'healthy' | 'degraded' | 'readonly' | 'offline' | string;

// DatabaseStatus is the full status object returned by /status endpoint (context uses this)
export interface DatabaseStatus {
  healthy: boolean;
  currentConnections: number;
  maxConnections: number;
  region: string;
  version: string;
  uptimeSeconds: number;
  totalSizeMb: number;
}
export type DatabaseMode = 'single' | 'ha' | 'serverless';
export type ColumnType =
  | 'bigint' | 'bigserial' | 'boolean' | 'char' | 'citext' | 'date'
  | 'decimal' | 'float4' | 'float8' | 'inet' | 'integer' | 'interval'
  | 'json' | 'jsonb' | 'numeric' | 'oid' | 'real' | 'serial'
  | 'smallint' | 'smallserial' | 'text' | 'time' | 'timestamp' | 'timestamptz'
  | 'timetz' | 'uuid' | 'varchar' | 'xml';

export interface Database {
  id: string;
  name: string;
  type: 'postgres' | string;
  version: string;
  status: DatabaseStatusValue;
  mode: DatabaseMode;
  region: string;
  projectId: string;
  ownerId?: string;
  environment?: string;
  diskSizeMb: number;
  maxConnections: number;
  currentConnections: number;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
  connectionString?: string;
  passwordLastRotatedAt?: string;
  branchFrom?: string;
  parentId?: string;
  role?: string;
}

export interface DatabaseBranch {
  id: string;
  name: string;
  parentId: string;
  status: 'active' | 'creating' | 'restoring' | 'failed';
  createdAt: string;
  diskSizeMb: number;
}

export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view' | 'materialized_view';
  rowCount?: number;
  sizeBytes?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string | null;
  references?: { table: string; column: string };
  comment?: string;
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
  type: 'btree' | 'hash' | 'gist' | 'gin' | string;
}

export interface ConstraintInfo {
  name: string;
  table: string;
  type: 'p' | 'u' | 'c' | 'f' | 'x'; // primary, unique, check, foreign, exclude
  columns: string[];
  definition: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  status: 'success' | 'error';
  rowCount: number;
  durationMs: number;
  executedAt: string;
}

export interface MigrationRecord {
  id: string;
  name: string;
  status: 'applied' | 'pending' | 'failed';
  appliedAt?: string;
  error?: string;
  version: string;
  source?: 'api' | 'cli' | 'manual';
  appliedBy?: string;
}

export interface BackupRecord {
  id: string;
  status: 'completed' | 'in_progress' | 'failed';
  sizeBytes: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  url?: string;
  storageBucket?: string;
  versionLabel?: string;    // e.g. "v1", "v2" — user-provided or auto-incremented
  type: 'manual' | 'scheduled';
  scheduleId?: string;      // references BackupSchedule.id if type === 'scheduled'
}

export type BackupScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface BackupSchedule {
  id: string;
  enabled: boolean;
  frequency: BackupScheduleFrequency;
  timeUtc: string;          // "14:00"
  dayOfWeek?: number;       // 0=Sun … 6=Sat (weekly only)
  dayOfMonth?: number;     // 1–31 (monthly only)
  retentionCount: number;   // how many backups to keep before pruning
  storageBucket: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface BackupSettings {
  schedule: BackupSchedule | null;   // null = scheduling disabled
  defaultBucket: string;
  maxManualBackups: number;           // default 50
  autoBackupRetentionDays: number;   // default 7
}

export interface RealtimeTableInfo {
  schema: string;
  table: string;
  subscribers: number;
}

export interface RealtimeSubscriber {
  table: string;
  schema: string;
  id: string;
  columns?: string[];
}

export interface RealtimeEvent<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  old: Partial<T>;
  new: Partial<T>;
  timestamp: string;
}

export interface DataResult<T> {
  data: T[];
  count: number;
}

export interface LiveQueryResult<T> {
  data: T[];
  initial: boolean;
}

// ─── Storage types ──────────────────────────────────────────────────────────────

export type StorageProviderType = 'internal' | 'cloudinary' | 'telegram' | 's3';

export interface StorageBucket {
  id: string;
  name: string;
  provider: StorageProviderType;
  status: 'active' | 'creating' | 'deleting' | 'error';
  region?: string;            // only for internal/S3
  sizeBytes: number;
  objectCount: number;
  access: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

export interface StorageFile {
  id: string;
  key: string;                // full object key within bucket
  originalName?: string;      // original filename if uploaded with one
  mimeType?: string;
  sizeBytes: number;
  etag: string;
  createdAt: string;
}

export interface ProjectStorageConfig {
  id: string;
  projectId: string;
  defaultProvider: string;         // actual value: 'internal' | 'cloudinary' | 'telegram' | 's3'
  cloudinaryCredsSet: boolean;
  telegramCredsSet: boolean;
  createdAt: string;
  updatedAt: string;
}

// Pages for listFiles
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
  storageFileId: string;   // the storage provider's file ID
  key: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes: number;
  url: string;              // signed or permanent URL
  provider: StorageProviderType;
  application?: string;    // linked application name (e.g. 'products', 'avatars', 'backups')
  recordId?: string;        // linked record ID within that application (e.g. product_id)
  uploadedBy?: string;
  createdAt: string;
}
