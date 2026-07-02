/**
 * Mock data for development and testing.
 * All data structures mirror the real API responses.
 */

import type { MigrationRecord, BackupRecord, BackupSchedule, StorageBucket, StorageFile, ProjectStorageConfig, StorageFileRecord } from '@/types';

import type {
  User,
  Project,
  ProjectMember,
  Deployment,
  Queue,
  CronJob,
  Alert,
  EnvVar,
} from '@/types';

// ─── Users ─────────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: 'usr_01',
  email: 'admin@fidscript.dev',
  name: 'Admin User',
  role: 'owner',
  mfaEnabled: false,
  mustChangePassword: false,
  createdAt: '2026-01-15T10:30:00Z',
  credentials: [{ type: 'PASSWORD' }],
};

export const mockUsers: User[] = [
  mockUser,
  {
    id: 'usr_02',
    email: 'dev@fidscript.dev',
    name: 'Developer',
    role: 'developer',
    mfaEnabled: true,
    mustChangePassword: false,
    createdAt: '2026-03-20T14:00:00Z',
    credentials: [{ type: 'PASSWORD' }, { type: 'PASSKEY' }],
  },
  {
    id: 'usr_03',
    email: 'viewer@fidscript.dev',
    name: 'Viewer',
    role: 'viewer',
    mfaEnabled: false,
    mustChangePassword: false,
    createdAt: '2026-05-01T09:00:00Z',
    credentials: [{ type: 'PASSWORD' }],
  },
];

// ─── Projects ────────────────────────────────────────────────────────────────

export const mockProjects: Project[] = [
  {
    id: 'prj_01',
    name: 'Main Website',
    slug: 'main-website',
    type: 'frontend',
    status: 'active',
    ownerId: 'usr_01',
    role: 'owner',
    description: 'Company marketing website and blog',
    lastActivityAt: '2026-06-29T08:45:00Z',
    lastDeployAt: '2026-06-28T16:20:00Z',
    region: 'us-east-1',
    deploymentStrategy: 'rolling',
    subdomain: 'main-website',
    createdAt: '2026-01-20T12:00:00Z',
    updatedAt: '2026-06-28T16:20:00Z',
  },
  {
    id: 'prj_02',
    name: 'API Backend',
    slug: 'api-backend',
    type: 'backend',
    status: 'active',
    ownerId: 'usr_01',
    role: 'owner',
    description: 'Core REST API services',
    lastActivityAt: '2026-06-29T10:15:00Z',
    lastDeployAt: '2026-06-29T09:30:00Z',
    region: 'us-east-1',
    deploymentStrategy: 'blue-green',
    subdomain: 'api-backend',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-06-29T09:30:00Z',
  },
  {
    id: 'prj_03',
    name: 'Worker Service',
    slug: 'worker-service',
    type: 'worker',
    status: 'active',
    ownerId: 'usr_01',
    role: 'owner',
    description: 'Background job processor',
    lastActivityAt: '2026-06-27T22:00:00Z',
    lastDeployAt: '2026-06-27T22:00:00Z',
    region: 'us-east-1',
    deploymentStrategy: 'recreate',
    subdomain: 'worker-service',
    createdAt: '2026-02-15T14:30:00Z',
    updatedAt: '2026-06-27T22:00:00Z',
  },
  {
    id: 'prj_04',
    name: 'E-Commerce',
    slug: 'ecommerce',
    type: 'fullstack',
    status: 'active',
    ownerId: 'usr_02',
    role: 'developer',
    description: 'Online store with payments',
    lastActivityAt: '2026-06-29T07:00:00Z',
    lastDeployAt: '2026-06-25T11:00:00Z',
    region: 'eu-west-1',
    deploymentStrategy: 'rolling',
    subdomain: 'ecommerce',
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-06-25T11:00:00Z',
  },
];

// ─── Project Members ─────────────────────────────────────────────────────────

export const mockProjectMembers: Record<string, ProjectMember[]> = {
  prj_01: [
    { userId: 'usr_01', email: 'admin@fidscript.dev', role: 'owner', joinedAt: '2026-01-20T12:00:00Z' },
    { userId: 'usr_02', email: 'dev@fidscript.dev', role: 'developer', joinedAt: '2026-02-01T10:00:00Z' },
  ],
  prj_02: [
    { userId: 'usr_01', email: 'admin@fidscript.dev', role: 'owner', joinedAt: '2026-02-01T09:00:00Z' },
  ],
  prj_03: [
    { userId: 'usr_01', email: 'admin@fidscript.dev', role: 'owner', joinedAt: '2026-02-15T14:30:00Z' },
    { userId: 'usr_03', email: 'viewer@fidscript.dev', role: 'viewer', joinedAt: '2026-04-01T12:00:00Z' },
  ],
  prj_04: [
    { userId: 'usr_02', email: 'dev@fidscript.dev', role: 'owner', joinedAt: '2026-03-10T08:00:00Z' },
  ],
};

// ─── Deployments ─────────────────────────────────────────────────────────────

export const mockDeployments: Record<string, Deployment[]> = {
  prj_01: [
    {
      id: 'dep_01',
      projectId: 'prj_01',
      releaseId: 'rel_01',
      status: 'completed',
      deploymentUrl: 'https://main-website.preview.fidscript.dev',
      rolledBackToId: null,
      createdAt: '2026-06-28T16:20:00Z',
      completedAt: '2026-06-28T16:25:00Z',
      version: '1.24.0',
      commitSha: 'a1b2c3d4',
      commitMessage: 'Update hero section and fix mobile nav',
      branch: 'main',
      imageTag: 'v1.24.0',
      sourceType: 'git',
      createdBy: 'usr_01',
    },
    {
      id: 'dep_02',
      projectId: 'prj_01',
      releaseId: 'rel_02',
      status: 'completed',
      deploymentUrl: 'https://main-website.preview.fidscript.dev',
      rolledBackToId: null,
      createdAt: '2026-06-27T10:00:00Z',
      completedAt: '2026-06-27T10:05:00Z',
      version: '1.23.5',
      commitSha: 'e5f6g7h8',
      commitMessage: 'Add new feature: dark mode toggle',
      branch: 'main',
      imageTag: 'v1.23.5',
      sourceType: 'git',
      createdBy: 'usr_02',
    },
    {
      id: 'dep_03',
      projectId: 'prj_01',
      releaseId: null,
      status: 'failed',
      deploymentUrl: null,
      rolledBackToId: 'dep_02',
      createdAt: '2026-06-26T14:30:00Z',
      completedAt: '2026-06-26T14:32:00Z',
      version: '1.24.0-rc1',
      commitSha: 'i9j0k1l2',
      commitMessage: 'Attempt: migration to new auth provider',
      branch: 'feature/auth-migration',
      imageTag: 'v1.24.0-rc1',
      sourceType: 'git',
      createdBy: 'usr_01',
    },
  ],
  prj_02: [
    {
      id: 'dep_04',
      projectId: 'prj_02',
      releaseId: 'rel_03',
      status: 'completed',
      deploymentUrl: 'https://api.preview.fidscript.dev',
      rolledBackToId: null,
      createdAt: '2026-06-29T09:30:00Z',
      completedAt: '2026-06-29T09:35:00Z',
      version: '2.15.2',
      commitSha: 'm3n4o5p6',
      commitMessage: 'Performance: optimize database queries',
      branch: 'main',
      imageTag: 'v2.15.2',
      sourceType: 'git',
      createdBy: 'usr_01',
    },
    {
      id: 'dep_05',
      projectId: 'prj_02',
      releaseId: 'rel_04',
      status: 'running',
      deploymentUrl: null,
      rolledBackToId: null,
      createdAt: '2026-06-29T10:00:00Z',
      completedAt: null,
      version: '2.16.0-beta',
      commitSha: 'q7r8s9t0',
      commitMessage: 'Beta: new webhook system',
      branch: 'feature/webhooks-v2',
      imageTag: 'v2.16.0-beta',
      sourceType: 'git',
      createdBy: 'usr_01',
    },
  ],
};

// ─── Environment Variables ───────────────────────────────────────────────────

export const mockEnvVars: Record<string, EnvVar[]> = {
  prj_01: [
    { key: 'NEXT_PUBLIC_SITE_URL', value: 'https://fidscript.dev', encrypted: false },
    { key: 'NEXT_PUBLIC_ANALYTICS_ID', value: 'UA-XXXXX', encrypted: false },
    { key: 'DATABASE_URL', value: '***', encrypted: true },
    { key: 'API_SECRET_KEY', value: '***', encrypted: true },
  ],
  prj_02: [
    { key: 'DATABASE_URL', value: '***', encrypted: true },
    { key: 'REDIS_URL', value: '***', encrypted: true },
    { key: 'JWT_SECRET', value: '***', encrypted: true },
    { key: 'EXTERNAL_API_KEY', value: '***', encrypted: true },
    { key: 'NODE_ENV', value: 'production', encrypted: false },
    { key: 'PORT', value: '3000', encrypted: false },
  ],
};

// ─── Queues ──────────────────────────────────────────────────────────────────

export const mockQueues: Queue[] = [
  { id: 'q_01', name: 'email-sender', type: 'jetstream', status: 'active', createdAt: '2026-01-20T12:00:00Z' },
  { id: 'q_02', name: 'image-processor', type: 'jetstream', status: 'active', createdAt: '2026-02-01T09:00:00Z' },
  { id: 'q_03', name: 'notifications', type: 'jetstream', status: 'paused', createdAt: '2026-03-15T14:30:00Z' },
];

// ─── Cron Jobs ───────────────────────────────────────────────────────────────

export const mockCronJobs: CronJob[] = [
  {
    id: 'cron_01',
    projectId: 'prj_01',
    name: 'Daily Database Backup',
    cronExpression: '0 2 * * *',
    timezone: 'UTC',
    targetType: 'function',
    functionId: 'fn_backup_db',
    enabled: true,
    retryAttempts: 3,
    retryDelaySeconds: 60,
    timeoutSeconds: 300,
    lastRunAt: '2026-06-29T02:00:00Z',
    nextRunAt: '2026-06-30T02:00:00Z',
    state: 'completed',
    createdAt: '2026-01-20T12:00:00Z',
    updatedAt: '2026-06-29T02:00:00Z',
  },
  {
    id: 'cron_02',
    projectId: 'prj_01',
    name: 'Clean Expired Sessions',
    cronExpression: '*/15 * * * *',
    timezone: 'UTC',
    targetType: 'function',
    functionId: 'fn_clean_sessions',
    enabled: true,
    retryAttempts: 3,
    retryDelaySeconds: 60,
    timeoutSeconds: 300,
    lastRunAt: '2026-06-29T10:15:00Z',
    nextRunAt: '2026-06-29T10:30:00Z',
    state: 'completed',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-06-29T10:15:00Z',
  },
  {
    id: 'cron_03',
    projectId: 'prj_01',
    name: 'Weekly Report Generation',
    cronExpression: '0 8 * * 0',
    timezone: 'America/New_York',
    targetType: 'endpoint',
    endpoint: 'https://api.preview.fidscript.dev/reports/weekly',
    enabled: false,
    retryAttempts: 3,
    retryDelaySeconds: 60,
    timeoutSeconds: 300,
    lastRunAt: '2026-06-22T08:00:00Z',
    nextRunAt: undefined,
    state: 'scheduled',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-06-22T08:00:00Z',
  },
];

// ─── Alerts ─────────────────────────────────────────────────────────────────

export const mockAlerts: Alert[] = [
  {
    id: 'alert_01',
    severity: 'critical',
    status: 'firing',
    message: 'CPU usage exceeded 90% for 5 minutes',
    firstTriggeredAt: '2026-06-29T08:00:00Z',
    firedAt: '2026-06-29T08:00:00Z',
    acknowledgedAt: undefined,
    resolvedAt: undefined,
  },
  {
    id: 'alert_02',
    severity: 'warning',
    status: 'pending',
    message: 'Memory usage above 80%',
    firstTriggeredAt: '2026-06-29T09:30:00Z',
    firedAt: undefined,
    acknowledgedAt: undefined,
    resolvedAt: undefined,
  },
  {
    id: 'alert_03',
    severity: 'info',
    status: 'resolved',
    message: 'Deployment completed successfully',
    firstTriggeredAt: '2026-06-28T16:20:00Z',
    firedAt: '2026-06-28T16:20:00Z',
    acknowledgedAt: '2026-06-28T16:25:00Z',
    resolvedAt: '2026-06-28T16:25:00Z',
  },
];

// ─── Storage Buckets ─────────────────────────────────────────────────────────

export { type StorageBucket };

export const mockStorageBuckets: StorageBucket[] = [
  { id: 'bucket_01', name: 'assets',        provider: 'internal',   status: 'active', region: 'us-east-1', sizeBytes: 524_288_000, objectCount: 156, access: 'public',  createdAt: '2026-01-20T12:00:00Z', updatedAt: '2026-01-20T12:00:00Z' },
  { id: 'bucket_02', name: 'user-uploads',  provider: 'cloudinary',  status: 'active', region: 'us-east-1', sizeBytes: 2_147_483_648, objectCount: 892, access: 'private', createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-02-01T09:00:00Z' },
  { id: 'bucket_03', name: 'backups',      provider: 'internal',   status: 'active', region: 'us-east-1', sizeBytes: 10_737_418_240, objectCount: 24, access: 'private', createdAt: '2026-03-01T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z' },
];

export const mockStorageFiles: Record<string, StorageFile[]> = {
  bucket_01: [
    { id: 'f_01', key: 'images/logo.svg',       originalName: 'logo.svg',       mimeType: 'image/svg+xml',         sizeBytes: 4_234,  etag: 'abc123', createdAt: '2026-06-28T10:00:00Z' },
    { id: 'f_02', key: 'images/hero.jpg',        originalName: 'hero.jpg',        mimeType: 'image/jpeg',            sizeBytes: 245_678, etag: 'def456', createdAt: '2026-06-27T15:30:00Z' },
    { id: 'f_03', key: 'images/thumb.png',        originalName: 'thumb.png',        mimeType: 'image/png',             sizeBytes: 34_521, etag: 'ghi789', createdAt: '2026-06-26T09:15:00Z' },
    { id: 'f_04', key: 'videos/demo.mp4',         originalName: 'demo.mp4',          mimeType: 'video/mp4',            sizeBytes: 15_728_640, etag: 'jkl012', createdAt: '2026-06-25T14:00:00Z' },
    { id: 'f_05', key: 'docs/readme.md',           originalName: 'readme.md',        mimeType: 'text/markdown',        sizeBytes: 2_341, etag: 'mno345', createdAt: '2026-06-24T08:00:00Z' },
    { id: 'f_06', key: 'audio/podcast-ep1.mp3',   originalName: 'podcast-ep1.mp3',  mimeType: 'audio/mpeg',           sizeBytes: 52_428_800, etag: 'pqr678', createdAt: '2026-06-23T11:00:00Z' },
    { id: 'f_07', key: 'images/banner.webp',      originalName: 'banner.webp',      mimeType: 'image/webp',           sizeBytes: 89_432, etag: 'stu901', createdAt: '2026-06-22T16:45:00Z' },
    { id: 'f_08', key: 'pdfs/report-q2.pdf',       originalName: 'report-q2.pdf',     mimeType: 'application/pdf',      sizeBytes: 1_245_678, etag: 'vwx234', createdAt: '2026-06-21T13:20:00Z' },
  ],
  bucket_02: [
    { id: 'f_10', key: 'avatars/user_01.png',   originalName: 'user_01.png',    mimeType: 'image/png',    sizeBytes: 15_234, etag: 'yyy111', createdAt: '2026-06-20T09:00:00Z' },
    { id: 'f_11', key: 'attachments/doc.pdf',    originalName: 'doc.pdf',        mimeType: 'application/pdf', sizeBytes: 234_567, etag: 'zzz222', createdAt: '2026-06-19T14:30:00Z' },
  ],
};

export const mockProjectStorageConfig: ProjectStorageConfig = {
  id: 'psc_01',
  projectId: 'prj_01',
  defaultProvider: 'internal',
  cloudinaryCredsSet: true,
  telegramCredsSet: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-15T10:00:00Z',
};

// Internal storage file records — links uploaded files to application resources
export const mockStorageFileRecords: StorageFileRecord[] = [
  // Products — product images linked via application + record_id
  {
    id: 'sfr_01', projectId: 'prj_01', bucketId: 'bucket_01', storageFileId: 'f_01',
    key: 'images/logo.svg', originalName: 'logo.svg', mimeType: 'image/svg+xml',
    sizeBytes: 4_234,
    url: '/api/v1/storage/bucket_01/images/logo.svg?token=mock',
    provider: 'internal', application: 'products', recordId: 'prod_logo', uploadedBy: 'usr_01',
    createdAt: '2026-06-28T10:00:00Z',
  },
  {
    id: 'sfr_02', projectId: 'prj_01', bucketId: 'bucket_01', storageFileId: 'f_02',
    key: 'images/hero.jpg', originalName: 'hero.jpg', mimeType: 'image/jpeg',
    sizeBytes: 245_678,
    url: '/api/v1/storage/bucket_01/images/hero.jpg?token=mock',
    provider: 'internal', application: 'products', recordId: 'prod_hero', uploadedBy: 'usr_01',
    createdAt: '2026-06-27T15:30:00Z',
  },
  {
    id: 'sfr_03', projectId: 'prj_01', bucketId: 'bucket_01', storageFileId: 'f_03',
    key: 'images/thumb.png', originalName: 'thumb.png', mimeType: 'image/png',
    sizeBytes: 34_521,
    url: '/api/v1/storage/bucket_01/images/thumb.png?token=mock',
    provider: 'internal', application: 'products', recordId: 'prod_thumb', uploadedBy: 'usr_01',
    createdAt: '2026-06-26T09:15:00Z',
  },
  {
    id: 'sfr_04', projectId: 'prj_01', bucketId: 'bucket_01', storageFileId: 'f_07',
    key: 'images/banner.webp', originalName: 'banner.webp', mimeType: 'image/webp',
    sizeBytes: 89_432,
    url: '/api/v1/storage/bucket_01/images/banner.webp?token=mock',
    provider: 'internal', application: 'marketing', recordId: 'banner_home', uploadedBy: 'usr_02',
    createdAt: '2026-06-22T16:45:00Z',
  },
  // Backups — stored in backups bucket
  {
    id: 'sfr_05', projectId: 'prj_01', bucketId: 'bucket_03', storageFileId: 'bk_01',
    key: 'backups/2026-06-25.sql.gz', originalName: 'database-2026-06-25.sql.gz', mimeType: 'application/gzip',
    sizeBytes: 5_242_880,
    url: '/api/v1/storage/backups/bk_01/database.sql.gz?token=mock',
    provider: 'internal', application: 'backups', recordId: 'db_backup_20260625', uploadedBy: 'system',
    createdAt: '2026-06-25T02:07:32Z',
  },
  {
    id: 'sfr_06', projectId: 'prj_01', bucketId: 'bucket_03', storageFileId: 'bk_02',
    key: 'backups/2026-06-26.sql.gz', originalName: 'database-2026-06-26.sql.gz', mimeType: 'application/gzip',
    sizeBytes: 5_157_120,
    url: '/api/v1/storage/backups/bk_02/database.sql.gz?token=mock',
    provider: 'internal', application: 'backups', recordId: 'db_backup_20260626', uploadedBy: 'system',
    createdAt: '2026-06-26T02:06:44Z',
  },
  // User uploads in cloudinary bucket
  {
    id: 'sfr_07', projectId: 'prj_01', bucketId: 'bucket_02', storageFileId: 'f_10',
    key: 'avatars/user_01.png', originalName: 'user_01.png', mimeType: 'image/png',
    sizeBytes: 15_234,
    url: 'https://res.cloudinary.com/demo/image/upload/v1/avatars/user_01.png',
    provider: 'cloudinary', application: 'users', recordId: 'usr_01', uploadedBy: 'usr_01',
    createdAt: '2026-06-20T09:00:00Z',
  },
  {
    id: 'sfr_08', projectId: 'prj_01', bucketId: 'bucket_02', storageFileId: 'f_11',
    key: 'attachments/doc.pdf', originalName: 'doc.pdf', mimeType: 'application/pdf',
    sizeBytes: 234_567,
    url: 'https://res.cloudinary.com/demo/image/upload/v1/attachments/doc.pdf',
    provider: 'cloudinary', application: 'documents', recordId: 'doc_01', uploadedBy: 'usr_02',
    createdAt: '2026-06-19T14:30:00Z',
  },
];

// ─── Database Info ────────────────────────────────────────────────────────────

import type { Database, TableInfo, ColumnInfo, IndexInfo, ConstraintInfo } from '@/types';

export const mockDatabases: Database[] = [
  {
    id: 'db_01', name: 'main_postgres', type: 'postgres', version: '16.3',
    status: 'healthy', mode: 'ha', region: 'us-east-1', projectId: 'prj_01',
    diskSizeMb: 10240, maxConnections: 100, currentConnections: 12,
    createdAt: '2026-01-20T12:00:00Z', updatedAt: '2026-06-01T08:00:00Z',
    passwordLastRotatedAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'db_02', name: 'analytics', type: 'postgres', version: '16.3',
    status: 'healthy', mode: 'single', region: 'us-east-1', projectId: 'prj_01',
    diskSizeMb: 20480, maxConnections: 50, currentConnections: 5,
    createdAt: '2026-02-15T09:00:00Z', updatedAt: '2026-06-10T12:00:00Z',
  },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

export const mockSchema: TableInfo[] = [
  { schema: 'public', name: 'users',         type: 'table', rowCount: 1842,  sizeBytes: 2_097_152,  comment: 'User accounts' },
  { schema: 'public', name: 'orders',        type: 'table', rowCount: 9130,  sizeBytes: 4_194_304,  comment: 'Customer orders' },
  { schema: 'public', name: 'products',      type: 'table', rowCount: 423,   sizeBytes: 524_288,   comment: 'Product catalog' },
  { schema: 'public', name: 'order_items',   type: 'table', rowCount: 34_821, sizeBytes: 8_388_608,  comment: 'Order line items' },
  { schema: 'public', name: 'categories',    type: 'table', rowCount: 18,    sizeBytes: 65_536,    comment: 'Product categories' },
  { schema: 'public', name: 'sessions',      type: 'table', rowCount: 2304,  sizeBytes: 1_048_576,  comment: 'User sessions' },
  { schema: 'public', name: 'api_keys',      type: 'table', rowCount: 67,    sizeBytes: 32_768,    comment: 'API keys for external access' },
  { schema: 'public', name: 'audit_log',     type: 'table', rowCount: 98_210, sizeBytes: 33_554_432, comment: 'Audit trail for all mutations' },
  { schema: 'public', name: 'realtime_presences', type: 'table', rowCount: 0, sizeBytes: 16_384, comment: 'Presence tracking' },
  { schema: 'public', name: 'storage_files',  type: 'table', rowCount: 12,   sizeBytes: 32_768,    comment: 'Internal tracking of uploaded storage files with application links' },
  { schema: 'public', name: 'monthly_sales', type: 'view',   comment: 'Aggregated monthly sales by category' },
];

export const mockColumns: Record<string, ColumnInfo[]> = {
  users: [
    { name: 'id',         type: 'uuid',        isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()',   comment: 'Primary key' },
    { name: 'email',      type: 'varchar(255)', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,                comment: 'Unique email address' },
    { name: 'full_name',  type: 'varchar(150)', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,                comment: 'Display name' },
    { name: 'avatar_url', type: 'text',         isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,                comment: 'Profile picture URL' },
    { name: 'role',       type: 'varchar(30)',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: "'customer'",        comment: 'Account role: customer | admin | support' },
    { name: 'status',     type: 'varchar(20)',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: "'active'",          comment: 'Account status: active | suspended | pending' },
    { name: 'created_at', type: 'timestamptz', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',              comment: 'Account creation timestamp' },
    { name: 'updated_at', type: 'timestamptz', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',              comment: 'Last update timestamp' },
    { name: 'last_login', type: 'timestamptz', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,                comment: 'Last successful login' },
  ],
  orders: [
    { name: 'id',           type: 'uuid',        isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Primary key' },
    { name: 'user_id',      type: 'uuid',        isNullable: false, isPrimaryKey: false, isForeignKey: true,  defaultValue: null,              comment: 'FK → users.id', references: { table: 'users', column: 'id' } },
    { name: 'status',       type: 'varchar(30)', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: "'pending'",    comment: 'pending | confirmed | shipped | delivered | cancelled' },
    { name: 'total_cents',  type: 'bigint',      isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: '0',              comment: 'Order total in cents' },
    { name: 'currency',     type: 'char(3)',     isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: "'USD'",          comment: 'ISO 4217 currency code' },
    { name: 'shipping_addr',type: 'jsonb',       isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,            comment: 'Shipping address object' },
    { name: 'notes',        type: 'text',        isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,            comment: 'Order notes or special instructions' },
    { name: 'created_at',   type: 'timestamptz', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',          comment: 'Order placement timestamp' },
    { name: 'shipped_at',   type: 'timestamptz', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,            comment: 'Shipment timestamp' },
    { name: 'delivered_at', type: 'timestamptz', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,            comment: 'Delivery confirmation timestamp' },
  ],
  products: [
    { name: 'id',           type: 'uuid',         isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Primary key' },
    { name: 'name',         type: 'varchar(255)',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Product display name' },
    { name: 'slug',         type: 'varchar(300)',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'URL-friendly identifier' },
    { name: 'description',  type: 'text',          isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Full product description (HTML allowed)' },
    { name: 'price_cents',  type: 'bigint',        isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Price in cents' },
    { name: 'category_id',  type: 'uuid',          isNullable: true,  isPrimaryKey: false, isForeignKey: true,  defaultValue: null,           comment: 'FK → categories.id', references: { table: 'categories', column: 'id' } },
    { name: 'inventory',    type: 'integer',       isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: '0',            comment: 'Current stock count' },
    { name: 'sku',          type: 'varchar(100)',   isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Stock keeping unit' },
    { name: 'is_active',    type: 'boolean',       isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'true',         comment: 'Whether product is listed' },
    { name: 'created_at',   type: 'timestamptz',    isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',         comment: 'Creation timestamp' },
    { name: 'updated_at',   type: 'timestamptz',    isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',         comment: 'Last update timestamp' },
  ],
  order_items: [
    { name: 'id',         type: 'uuid',    isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Primary key' },
    { name: 'order_id',   type: 'uuid',    isNullable: false, isPrimaryKey: false, isForeignKey: true,  defaultValue: null,           comment: 'FK → orders.id', references: { table: 'orders', column: 'id' } },
    { name: 'product_id', type: 'uuid',    isNullable: false, isPrimaryKey: false, isForeignKey: true,  defaultValue: null,           comment: 'FK → products.id', references: { table: 'products', column: 'id' } },
    { name: 'quantity',   type: 'integer', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Quantity ordered' },
    { name: 'unit_cents', type: 'bigint',   isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Price per unit in cents' },
    { name: 'created_at', type: 'timestamptz', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',    comment: 'Line item creation timestamp' },
  ],
  categories: [
    { name: 'id',          type: 'uuid',        isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Primary key' },
    { name: 'name',        type: 'varchar(100)', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,          comment: 'Category name' },
    { name: 'slug',        type: 'varchar(150)', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,          comment: 'URL-friendly slug' },
    { name: 'parent_id',   type: 'uuid',         isNullable: true,  isPrimaryKey: false, isForeignKey: true,  defaultValue: null,          comment: 'FK → categories.id (self-reference)', references: { table: 'categories', column: 'id' } },
    { name: 'description', type: 'text',          isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,          comment: 'Category description' },
    { name: 'sort_order',  type: 'smallint',     isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: '0',          comment: 'Display ordering' },
    { name: 'created_at',  type: 'timestamptz',   isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',         comment: 'Creation timestamp' },
  ],
  sessions: [
    { name: 'id',          type: 'uuid',        isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Primary key' },
    { name: 'user_id',     type: 'uuid',         isNullable: false, isPrimaryKey: false, isForeignKey: true,  defaultValue: null,           comment: 'FK → users.id', references: { table: 'users', column: 'id' } },
    { name: 'token_hash',  type: 'varchar(64)',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'SHA-256 hash of session token' },
    { name: 'ip_address',  type: 'inet',         isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Client IP address' },
    { name: 'user_agent',  type: 'text',         isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Client user agent string' },
    { name: 'expires_at',  type: 'timestamptz',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Session expiry timestamp' },
    { name: 'created_at',  type: 'timestamptz',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',          comment: 'Session creation timestamp' },
  ],
  api_keys: [
    { name: 'id',          type: 'uuid',         isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Primary key' },
    { name: 'name',        type: 'varchar(100)',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Descriptive key name' },
    { name: 'key_hash',    type: 'varchar(64)',   isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'SHA-256 hash of the actual key value' },
    { name: 'user_id',     type: 'uuid',          isNullable: true,  isPrimaryKey: false, isForeignKey: true,  defaultValue: null,           comment: 'FK → users.id (owner)', references: { table: 'users', column: 'id' } },
    { name: 'last_used_at',type: 'timestamptz',   isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Last usage timestamp' },
    { name: 'expires_at',  type: 'timestamptz',   isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Key expiry timestamp (null = never)' },
    { name: 'created_at',  type: 'timestamptz',   isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',         comment: 'Creation timestamp' },
  ],
  audit_log: [
    { name: 'id',          type: 'bigserial',    isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: null,              comment: 'Auto-incrementing ID' },
    { name: 'table_name',  type: 'varchar(100)', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,              comment: 'Affected table name' },
    { name: 'record_id',   type: 'varchar(100)', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,              comment: 'Affected row PK (varchar for flexibility)' },
    { name: 'action',      type: 'varchar(20)',   isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,              comment: 'INSERT | UPDATE | DELETE' },
    { name: 'old_data',    type: 'jsonb',         isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,              comment: 'Previous row state for UPDATE/DELETE' },
    { name: 'new_data',    type: 'jsonb',         isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,              comment: 'New row state for INSERT/UPDATE' },
    { name: 'actor_id',    type: 'uuid',          isNullable: true,  isPrimaryKey: false, isForeignKey: true,  defaultValue: null,              comment: 'FK → users.id (who made the change)', references: { table: 'users', column: 'id' } },
    { name: 'actor_email', type: 'varchar(255)',  isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,              comment: 'Denormalized actor email for readability' },
    { name: 'ip_address',  type: 'inet',          isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,              comment: 'Client IP that triggered the change' },
    { name: 'created_at', type: 'timestamptz',   isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',           comment: 'Audit event timestamp' },
  ],
  realtime_presences: [
    { name: 'id',         type: 'uuid',        isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Primary key' },
    { name: 'channel',    type: 'varchar(255)', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Presence channel name' },
    { name: 'user_id',    type: 'uuid',         isNullable: true,  isPrimaryKey: false, isForeignKey: true,  defaultValue: null,           comment: 'FK → users.id', references: { table: 'users', column: 'id' } },
    { name: 'payload',    type: 'jsonb',        isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Custom presence data (name, avatar, status)' },
    { name: 'last_seen_at',type: 'timestamptz', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',         comment: 'Last heartbeat timestamp' },
  ],
  storage_files: [
    { name: 'id',             type: 'uuid',        isNullable: false, isPrimaryKey: true,  isForeignKey: false, defaultValue: 'gen_random_uuid()', comment: 'Unique file record ID' },
    { name: 'project_id',     type: 'uuid',        isNullable: false, isPrimaryKey: false, isForeignKey: true,  defaultValue: null,           comment: 'FK → projects.id' },
    { name: 'bucket_id',      type: 'varchar(100)',isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Storage bucket ID (e.g. bucket_01)' },
    { name: 'storage_file_id',type: 'varchar(100)',isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,         comment: 'Reference to the storage provider file ID' },
    { name: 'key',            type: 'text',         isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,           comment: 'Full object key within bucket' },
    { name: 'original_name',  type: 'varchar(500)', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,         comment: 'Original uploaded filename' },
    { name: 'mime_type',      type: 'varchar(100)', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,         comment: 'MIME type of the file' },
    { name: 'size_bytes',    type: 'bigint',       isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,         comment: 'File size in bytes' },
    { name: 'url',            type: 'text',         isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: null,         comment: 'Signed or permanent URL to access the file' },
    { name: 'provider',       type: 'varchar(20)',  isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'internal',   comment: 'Storage provider: internal | cloudinary | telegram | s3' },
    { name: 'application',    type: 'varchar(100)', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,         comment: 'Application this file is linked to (e.g. products, avatars, backups)' },
    { name: 'record_id',      type: 'varchar(100)', isNullable: true,  isPrimaryKey: false, isForeignKey: false, defaultValue: null,         comment: 'Associated record ID in the application (e.g. product_id, user_id)' },
    { name: 'uploaded_by',   type: 'uuid',         isNullable: true,  isPrimaryKey: false, isForeignKey: true,  defaultValue: null,         comment: 'FK → users.id', references: { table: 'users', column: 'id' } },
    { name: 'created_at',    type: 'timestamptz', isNullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: 'now()',      comment: 'Upload timestamp' },
  ],
};

export const mockIndexes: Record<string, IndexInfo[]> = {
  users: [
    { name: 'users_email_key',         table: 'users', columns: ['email'],      isUnique: true,  isPrimary: false, type: 'btree' },
    { name: 'users_id_pkey',           table: 'users', columns: ['id'],         isUnique: true,  isPrimary: true,  type: 'btree' },
    { name: 'users_role_idx',          table: 'users', columns: ['role'],       isUnique: false, isPrimary: false, type: 'btree' },
    { name: 'users_status_idx',        table: 'users', columns: ['status'],    isUnique: false, isPrimary: false, type: 'btree' },
    { name: 'users_created_at_idx',    table: 'users', columns: ['created_at'], isUnique: false, isPrimary: false, type: 'btree' },
  ],
  orders: [
    { name: 'orders_id_pkey',          table: 'orders', columns: ['id'],         isUnique: true,  isPrimary: true,  type: 'btree' },
    { name: 'orders_user_id_idx',       table: 'orders', columns: ['user_id'],    isUnique: false, isPrimary: false, type: 'btree' },
    { name: 'orders_status_idx',       table: 'orders', columns: ['status'],    isUnique: false, isPrimary: false, type: 'btree' },
    { name: 'orders_created_at_idx',   table: 'orders', columns: ['created_at'], isUnique: false, isPrimary: false, type: 'btree' },
  ],
  products: [
    { name: 'products_id_pkey',        table: 'products', columns: ['id'],          isUnique: true,  isPrimary: true,  type: 'btree' },
    { name: 'products_slug_key',       table: 'products', columns: ['slug'],         isUnique: true,  isPrimary: false, type: 'btree' },
    { name: 'products_category_idx',   table: 'products', columns: ['category_id'], isUnique: false, isPrimary: false, type: 'btree' },
    { name: 'products_is_active_idx',  table: 'products', columns: ['is_active'],  isUnique: false, isPrimary: false, type: 'btree' },
  ],
  order_items: [
    { name: 'order_items_id_pkey',    table: 'order_items', columns: ['id'],        isUnique: true,  isPrimary: true,  type: 'btree' },
    { name: 'order_items_order_id_idx',table: 'order_items', columns: ['order_id'], isUnique: false, isPrimary: false, type: 'btree' },
    { name: 'order_items_product_idx',table: 'order_items', columns: ['product_id'],isUnique: false, isPrimary: false, type: 'btree' },
  ],
};

export const mockConstraints: Record<string, ConstraintInfo[]> = {
  users: [
    { name: 'users_email_key',    table: 'users', type: 'u', columns: ['email'],    definition: 'UNIQUE (email)' },
    { name: 'users_id_pkey',       table: 'users', type: 'p', columns: ['id'],       definition: 'PRIMARY KEY (id)' },
    { name: 'users_role_check',    table: 'users', type: 'c', columns: ['role'],     definition: "CHECK (role IN ('customer','admin','support'))" },
    { name: 'users_status_check',  table: 'users', type: 'c', columns: ['status'],   definition: "CHECK (status IN ('active','suspended','pending','deleted'))" },
  ],
  orders: [
    { name: 'orders_id_pkey',            table: 'orders', type: 'p', columns: ['id'],     definition: 'PRIMARY KEY (id)' },
    { name: 'orders_user_id_fkey',       table: 'orders', type: 'f', columns: ['user_id'], definition: 'FOREIGN KEY (user_id) REFERENCES users(id)' },
    { name: 'orders_total_cents_check',  table: 'orders', type: 'c', columns: ['total_cents'], definition: 'CHECK (total_cents >= 0)' },
  ],
  products: [
    { name: 'products_id_pkey',         table: 'products', type: 'p', columns: ['id'],          definition: 'PRIMARY KEY (id)' },
    { name: 'products_slug_key',        table: 'products', type: 'u', columns: ['slug'],        definition: 'UNIQUE (slug)' },
    { name: 'products_category_fkey',   table: 'products', type: 'f', columns: ['category_id'],definition: 'FOREIGN KEY (category_id) REFERENCES categories(id)' },
    { name: 'products_price_cents_check', table: 'products', type: 'c', columns: ['price_cents'], definition: 'CHECK (price_cents >= 0)' },
    { name: 'products_inventory_check',  table: 'products', type: 'c', columns: ['inventory'],  definition: 'CHECK (inventory >= 0)' },
  ],
  order_items: [
    { name: 'order_items_id_pkey',        table: 'order_items', type: 'p', columns: ['id'],         definition: 'PRIMARY KEY (id)' },
    { name: 'order_items_order_id_fkey',   table: 'order_items', type: 'f', columns: ['order_id'],   definition: 'FOREIGN KEY (order_id) REFERENCES orders(id)' },
    { name: 'order_items_product_id_fkey', table: 'order_items', type: 'f', columns: ['product_id'],definition: 'FOREIGN KEY (product_id) REFERENCES products(id)' },
    { name: 'order_items_quantity_check',  table: 'order_items', type: 'c', columns: ['quantity'],   definition: 'CHECK (quantity > 0)' },
  ],
  categories: [
    { name: 'categories_id_pkey',      table: 'categories', type: 'p', columns: ['id'],       definition: 'PRIMARY KEY (id)' },
    { name: 'categories_parent_fkey',  table: 'categories', type: 'f', columns: ['parent_id'], definition: 'FOREIGN KEY (parent_id) REFERENCES categories(id)' },
  ],
};

export const mockMigrations: MigrationRecord[] = [
  { id: 'mig_001', name: '20260101_initial_schema',  status: 'applied',  appliedAt: '2026-01-20T12:05:00Z', error: undefined,  version: '20260101', source: 'cli',    appliedBy: 'admin@fidscript.dev' },
  { id: 'mig_002', name: '20260215_add_audit_log',    status: 'applied',  appliedAt: '2026-02-15T09:10:00Z', error: undefined,  version: '20260215', source: 'api',    appliedBy: 'admin@fidscript.dev' },
  { id: 'mig_003', name: '20260301_add_realtime',     status: 'applied',  appliedAt: '2026-03-01T10:00:00Z', error: undefined,  version: '20260301', source: 'api',    appliedBy: 'admin@fidscript.dev' },
  { id: 'mig_004', name: '20260420_add_sessions',     status: 'applied',  appliedAt: '2026-04-20T11:30:00Z', error: undefined,  version: '20260420', source: 'cli',    appliedBy: 'CI pipeline' },
  { id: 'mig_005', name: '20260601_add_api_keys',     status: 'pending',  appliedAt: undefined,               error: undefined,  version: '20260601', source: 'manual', appliedBy: undefined },
];

export const mockBackups: BackupRecord[] = [
  { id: 'bk_01', status: 'completed',  sizeBytes: 5_242_880,  createdAt: '2026-06-25T02:00:00Z', completedAt: '2026-06-25T02:07:32Z', url: '/api/v1/storage/backups/bk_01/database.sql.gz', storageBucket: 'db-backups', versionLabel: 'v1', type: 'scheduled', scheduleId: 'bs_01' },
  { id: 'bk_02', status: 'completed',  sizeBytes: 5_157_120,  createdAt: '2026-06-26T02:00:00Z', completedAt: '2026-06-26T02:06:44Z', url: '/api/v1/storage/backups/bk_02/database.sql.gz', storageBucket: 'db-backups', versionLabel: 'v2', type: 'scheduled', scheduleId: 'bs_01' },
  { id: 'bk_03', status: 'completed',  sizeBytes: 5_242_880,  createdAt: '2026-06-27T02:00:00Z', completedAt: '2026-06-27T02:09:45Z', url: '/api/v1/storage/backups/bk_03/database.sql.gz', storageBucket: 'db-backups', versionLabel: 'v3', type: 'scheduled', scheduleId: 'bs_01' },
  { id: 'bk_04', status: 'completed',  sizeBytes: 5_387_264,  createdAt: '2026-06-28T14:22:00Z', completedAt: '2026-06-28T14:28:11Z', url: '/api/v1/storage/backups/bk_04/database.sql.gz', storageBucket: 'db-backups', type: 'manual' },
  { id: 'bk_05', status: 'in_progress', sizeBytes: 0,         createdAt: '2026-06-29T02:00:00Z', completedAt: undefined, storageBucket: 'db-backups', type: 'scheduled', scheduleId: 'bs_01' },
];

export const mockBackupSchedules: BackupSchedule[] = [
  {
    id: 'bs_01',
    enabled: true,
    frequency: 'daily',
    timeUtc: '02:00',
    retentionCount: 7,
    storageBucket: 'db-backups',
    lastRunAt: '2026-06-29T02:00:00Z',
    nextRunAt: '2026-06-30T02:00:00Z',
    createdAt: '2026-06-01T00:00:00Z',
  },
];

// ─── Functions ───────────────────────────────────────────────────────────────

import type { Function_ } from '@/types';

export interface FunctionVersionInfo {
  version: string;
  createdAt: string;
  status: 'ACTIVE' | 'FAILED' | 'BUILDING';
}

export interface FunctionCodeInfo {
  code: string;                // current/live code
  version: string;              // version of the live code
  versionedCodes?: Record<string, string>;  // historical version → code snapshots
}

// Full function objects matching the real SDK's Function_ interface
export const mockFunctions: Function_[] = [
  {
    id: 'fn_01',
    name: 'process-payment',
    runtime: 'nodejs20',
    status: 'ACTIVE',
    projectId: 'prj_01',
    invokedCount: 12450,
    avgDuration: 245,
    lastInvokedAt: '2026-06-29T10:25:00Z',
    currentVersion: 'v1.3.0',
    memoryMb: 512,
    timeoutSeconds: 30,
    entryPoint: 'handler',
    envVars: { STRIPE_KEY: '***', REDIS_URL: '***' },
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'fn_02',
    name: 'send-email',
    runtime: 'nodejs20',
    status: 'ACTIVE',
    projectId: 'prj_01',
    invokedCount: 45230,
    avgDuration: 120,
    lastInvokedAt: '2026-06-29T10:20:00Z',
    currentVersion: 'v2.1.0',
    memoryMb: 256,
    timeoutSeconds: 15,
    entryPoint: 'handler',
    envVars: { SMTP_HOST: '***', SMTP_USER: '***' },
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'fn_03',
    name: 'generate-report',
    runtime: 'python311',
    status: 'ACTIVE',
    projectId: 'prj_02',
    invokedCount: 156,
    avgDuration: 3500,
    lastInvokedAt: '2026-06-28T08:00:00Z',
    currentVersion: 'v1.0.2',
    memoryMb: 1024,
    timeoutSeconds: 120,
    entryPoint: 'handler',
    envVars: { DB_URL: '***' },
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'fn_04',
    name: 'image-resize',
    runtime: 'nodejs20',
    status: 'FAILED',
    projectId: 'prj_02',
    invokedCount: 8900,
    avgDuration: 0,
    lastInvokedAt: '2026-06-27T14:30:00Z',
    currentVersion: 'v0.9.1',
    memoryMb: 512,
    timeoutSeconds: 20,
    entryPoint: 'handler',
    envVars: {},
    createdAt: '2026-03-15T14:30:00Z',
  },
];

// Function version history
export const mockFunctionVersions: Record<string, FunctionVersionInfo[]> = {
  fn_01: [
    { version: '1.3.0', createdAt: '2026-06-20T10:00:00Z', status: 'ACTIVE' },
    { version: '1.2.0', createdAt: '2026-05-15T14:00:00Z', status: 'ACTIVE' },
    { version: '1.1.0', createdAt: '2026-04-10T09:30:00Z', status: 'ACTIVE' },
    { version: '1.0.0', createdAt: '2026-02-01T09:00:00Z', status: 'ACTIVE' },
  ],
  fn_02: [
    { version: '2.1.0', createdAt: '2026-06-25T11:00:00Z', status: 'ACTIVE' },
    { version: '2.0.0', createdAt: '2026-05-20T16:00:00Z', status: 'ACTIVE' },
    { version: '1.0.0', createdAt: '2026-02-01T09:00:00Z', status: 'ACTIVE' },
  ],
  fn_03: [
    { version: '1.0.2', createdAt: '2026-06-10T08:00:00Z', status: 'ACTIVE' },
    { version: '1.0.1', createdAt: '2026-04-05T12:00:00Z', status: 'ACTIVE' },
    { version: '1.0.0', createdAt: '2026-03-01T10:00:00Z', status: 'ACTIVE' },
  ],
  fn_04: [
    { version: '0.9.1', createdAt: '2026-06-27T14:30:00Z', status: 'FAILED' },
    { version: '0.9.0', createdAt: '2026-06-01T10:00:00Z', status: 'ACTIVE' },
  ],
};

// Function code snapshots
export const mockFunctionCode: Record<string, FunctionCodeInfo> = {
  fn_01: {
    version: '1.3.0',
    code: `// process-payment — handles Stripe payment events
export async function handler(event) {
  const { type, data } = event;

  if (type === 'payment.created') {
    const { amount, currency, customerId } = data.object;

    // Call Stripe API to confirm payment
    const confirmed = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      confirm: true,
    });

    // Queue fulfillment event
    await queues.publish('fulfillment', {
      paymentId: confirmed.id,
      customerId,
      amount,
    });

    return { success: true, paymentIntent: confirmed.id };
  }

  return { success: false, reason: 'Unhandled event type' };
}
`,
  },
  fn_02: {
    version: '2.1.0',
    code: `// send-email — transactional email sender
export async function handler(event) {
  const { to, subject, template, data } = event;

  if (!to || !subject) {
    throw new Error('Missing required fields: to, subject');
  }

  const html = renderTemplate(template, data);

  const result = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY,
    },
    body: JSON.stringify({ To: to, Subject: subject, HtmlBody: html }),
  });

  if (!result.ok) {
    throw new Error(\`Postmark API error: \${result.status}\`);
  }

  return { messageId: (await result.json()).MessageID };
}

function renderTemplate(name, vars) {
  return \`<html><body><h1>Hello \${vars.name || 'User'}!</h1></body></html>\`;
}
`,
  },
  fn_03: {
    version: '1.0.2',
    code: `# generate-report — builds weekly analytics reports
import json
from datetime import datetime, timedelta

def handler(event, context):
    period = event.get('period', 'weekly')
    format = event.get('format', 'json')

    # Query database for the period
    start = datetime.utcnow() - timedelta(days=7)
    rows = db.query("""
        SELECT date, users, conversions, revenue
        FROM daily_stats
        WHERE date >= %s
        ORDER BY date ASC
    """, (start,))

    total_users = sum(r['users'] for r in rows)
    total_revenue = sum(r['revenue'] for r in rows)
    total_conversions = sum(r['conversions'] for r in rows)

    report = {
        'period': period,
        'generated_at': datetime.utcnow().isoformat(),
        'totals': {
            'users': total_users,
            'revenue': total_revenue,
            'conversions': total_conversions,
        },
        'daily_breakdown': rows,
    }

    if format == 'csv':
        return {'csv': to_csv(report) }

    return report
`,
  },
  fn_04: {
    version: '0.9.1',
    code: `// image-resize — processes image uploads via Sharp
// BROKEN: Missing 'sharp' dependency in bundle
export async function handler(event) {
  const { imageUrl, width, height, format } = event;

  const image = await fetch(imageUrl).then(r => r.buffer());

  // This will fail at runtime — sharp not bundled
  const resized = await sharp(image)
    .resize(width || 800, height || 600)
    .toFormat(format || 'webp')
    .toBuffer();

  return {
    buffer: resized.toString('base64'),
    contentType: \`image/\${format || 'webp'}\`,
  };
}
`,
  },
};

// Function-specific logs
export const mockFunctionLogs: Record<string, { id: string; timestamp: string; level: string; message: string }[]> = {
  fn_01: [
    { id: 'fl_01', timestamp: '2026-06-29T10:25:00Z', level: 'info', message: 'Invoked by queue: fulfillment' },
    { id: 'fl_02', timestamp: '2026-06-29T10:25:01Z', level: 'info', message: 'Payment intent pi_3OqT9s confirmed' },
    { id: 'fl_03', timestamp: '2026-06-29T10:25:01Z', level: 'info', message: 'Published fulfillment event to queue' },
    { id: 'fl_04', timestamp: '2026-29T09:15:00Z', level: 'warn', message: 'Stripe API latency spike: 1.2s' },
    { id: 'fl_05', timestamp: '2026-06-28T14:00:00Z', level: 'info', message: 'Invoked via HTTP: payment-webhook' },
  ],
  fn_02: [
    { id: 'fl_10', timestamp: '2026-06-29T10:20:00Z', level: 'info', message: 'Invoked: welcome-email template' },
    { id: 'fl_11', timestamp: '2026-06-29T10:20:00Z', level: 'info', message: 'Email sent: MessageID 123456' },
    { id: 'fl_12', timestamp: '2026-06-29T08:00:00Z', level: 'info', message: 'Scheduled: daily-digest for 100 recipients' },
    { id: 'fl_13', timestamp: '2026-06-28T08:00:00Z', level: 'error', message: 'SMTP connection refused: retrying in 5s' },
    { id: 'fl_14', timestamp: '2026-06-28T08:00:05Z', level: 'info', message: 'Retry succeeded after 1 attempt' },
  ],
  fn_03: [
    { id: 'fl_20', timestamp: '2026-06-28T08:00:00Z', level: 'info', message: 'Scheduled run started: weekly report' },
    { id: 'fl_21', timestamp: '2026-06-28T08:00:01Z', level: 'info', message: 'Query executed: 7 days, 3 tables joined' },
    { id: 'fl_22', timestamp: '2026-06-28T08:00:03Z', level: 'info', message: 'Report generated: 45KB JSON' },
    { id: 'fl_23', timestamp: '2026-06-28T08:00:04Z', level: 'info', message: 'Report emailed to admin@fidscript.dev' },
  ],
  fn_04: [
    { id: 'fl_30', timestamp: '2026-06-27T14:30:00Z', level: 'error', message: 'RuntimeError: sharp is not defined' },
    { id: 'fl_31', timestamp: '2026-06-27T14:30:00Z', level: 'error', message: 'at handler (image-resize:0.9.1:12)' },
    { id: 'fl_32', timestamp: '2026-06-27T14:30:00Z', level: 'info', message: 'Deployment failed — function in ERROR state' },
  ],
};

// ─── Domains ─────────────────────────────────────────────────────────────────

export interface DomainInfo {
  id: string;
  domain: string;
  status: 'active' | 'pending' | 'error';
  sslStatus: 'active' | 'pending' | 'expired';
  addedAt: string;
}

export interface DomainHealth {
  dnsOk: boolean;
  routingOk: boolean;
  sslOk: boolean;
  emailOk: boolean;
  responseTimeMs: number | null;
  sslExpiresInDays: number | null;
  status: 'ok' | 'degraded' | 'broken' | null;
  errorMessage: string | null;
  checkedAt: string;
  score: number;
  breakdown: { dns: number; routing: number; ssl: number; email: number };
}

export interface DomainSslInfo {
  enabled: boolean;
  status: string;
  method: string;
  issuedAt: string | null;
  expiresAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  autoRenew: boolean;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl?: number;
  status: 'ok' | 'missing' | 'pending';
  category: 'deployment' | 'email' | 'verification';
}

export const mockDomains: DomainInfo[] = [
  { id: 'dom_01', domain: 'fidscript.dev', status: 'active', sslStatus: 'active', addedAt: '2026-01-15T10:00:00Z' },
  { id: 'dom_02', domain: 'api.fidscript.dev', status: 'active', sslStatus: 'active', addedAt: '2026-01-15T10:00:00Z' },
  { id: 'dom_03', domain: 'staging.fidscript.dev', status: 'active', sslStatus: 'active', addedAt: '2026-02-01T09:00:00Z' },
];

export const mockDomainHealth: DomainHealth = {
  dnsOk: true,
  routingOk: true,
  sslOk: true,
  emailOk: true,
  responseTimeMs: 142,
  sslExpiresInDays: 67,
  status: 'ok',
  errorMessage: null,
  checkedAt: new Date().toISOString(),
  score: 100,
  breakdown: { dns: 30, routing: 20, ssl: 30, email: 20 },
};

export const mockDomainSsl: DomainSslInfo = {
  enabled: true,
  status: 'ACTIVE',
  method: 'letsencrypt',
  issuedAt: '2026-04-01T00:00:00Z',
  expiresAt: '2026-07-01T00:00:00Z',
  lastCheckedAt: new Date().toISOString(),
  lastError: null,
  autoRenew: true,
};

export const mockDnsRecords: DnsRecord[] = [
  { type: 'A', name: '@', value: '76.76.21.21', ttl: 300, status: 'ok', category: 'deployment' },
  { type: 'TXT', name: '_fidscript-verification.fidscript.dev', value: 'FIDScript verified dom_01', ttl: 300, status: 'ok', category: 'verification' },
  { type: 'MX', name: '@', value: 'mx1.fidscript.dev', priority: 10, ttl: 300, status: 'ok', category: 'email' },
  { type: 'MX', name: '@', value: 'mx2.fidscript.dev', priority: 20, ttl: 300, status: 'ok', category: 'email' },
  { type: 'TXT', name: '@', value: 'v=spf1 mx include:fidscript.dev ~all', ttl: 300, status: 'ok', category: 'email' },
  { type: 'TXT', name: 'default._domainkey.fidscript.dev', value: 'v=DKIM1; k=ed25519; p=...', ttl: 300, status: 'pending', category: 'email' },
  { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@fidscript.dev', ttl: 300, status: 'missing', category: 'email' },
];

// ─── Logs ────────────────────────────────────────────────────────────────────

export const mockLogEntries = [
  { id: 'log_01', level: 'info' as const, message: 'Deployment started', metadata: { deploymentId: 'dep_01', project: 'prj_01' }, timestamp: '2026-06-28T16:20:00Z' },
  { id: 'log_02', level: 'info' as const, message: 'Build completed successfully', metadata: { duration: '45s' }, timestamp: '2026-06-28T16:24:00Z' },
  { id: 'log_03', level: 'info' as const, message: 'Deployment completed', metadata: { deploymentId: 'dep_01', url: 'https://main-website.preview.fidscript.dev' }, timestamp: '2026-06-28T16:25:00Z' },
  { id: 'log_04', level: 'warn' as const, message: 'High memory usage detected', metadata: { usage: '82%' }, timestamp: '2026-06-29T09:00:00Z' },
  { id: 'log_05', level: 'error' as const, message: 'Failed to connect to external API', metadata: { endpoint: 'https://api.external.com', status: 503 }, timestamp: '2026-06-29T09:15:00Z' },
];
