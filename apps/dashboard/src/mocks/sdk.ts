/**
 * Mock SDK implementation that mirrors the real FidscriptSDK interface.
 * Returns mock data without making any HTTP calls.
 *
 * To enable mock mode: set NEXT_PUBLIC_USE_MOCK_API=true
 * To disable: set NEXT_PUBLIC_USE_MOCK_API=false or remove the variable
 */

import type { FidscriptSDK } from '@fidscript/sdk';
import type { DomainVerificationRun, DomainIncident, DomainHealthTimelineEntry } from '@fidscript/sdk';
import type {
  User,
  Project,
  ProjectMember,
  Deployment,
  EnvVar,
  Queue,
  QueueMessage,
  CronJob,
  CronJobRun,
  Alert,
  NotificationChannel,
  LogEntry,
  Function_,
  Database,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ConstraintInfo,
  QueryResult,
  QueryHistoryEntry,
  MigrationRecord,
  BackupRecord,
  BackupSchedule,
  RealtimeEvent,
  DataResult,
  LiveQueryResult,
  RealtimeSubscriber,
  StorageBucket,
  StorageFile,
  ProjectStorageConfig,
} from '@/types';
import {
  mockUser,
  mockUsers,
  mockProjects,
  mockProjectMembers,
  mockDeployments,
  mockEnvVars,
  mockQueues,
  mockCronJobs,
  mockAlerts,
  mockStorageBuckets,
  mockStorageFiles,
  mockProjectStorageConfig,
  mockDatabases,
  mockFunctions,
  mockFunctionVersions,
  mockFunctionCode,
  mockFunctionLogs,
  mockDomains,
  mockLogEntries,
  mockSchema,
  mockColumns,
  mockIndexes,
  mockConstraints,
  mockMigrations,
  mockBackups,
  mockBackupSchedules,
  mockDomainHealth,
  mockDomainSsl,
  mockDnsRecords,
  mockDomainVerificationRuns,
  mockDomainIncidents,
  mockDomainHealthTimeline,
  type DomainInfo,
  type DomainHealth,
  type DnsRecord,
  type DomainSslInfo,
  type FunctionVersionInfo,
} from './data';

// ─── Delay helper to simulate network latency ─────────────────────────────────

function delay(ms = 20): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Auth Module Mock ────────────────────────────────────────────────────────

class MockAuthModule {
  async me(): Promise<User> {
    await delay();
    return mockUser;
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    await delay(300);
    if (email && password.length >= 6) {
      return {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
      };
    }
    throw new Error('Invalid credentials');
  }

  async register(
    email: string,
    password: string | null,
    name: string,
    authMethod: 'PASSWORD' | 'MAGIC_CODE'
  ): Promise<void> {
    await delay(300);
    if (email && name) return;
    throw new Error('Registration failed');
  }

  async logout(): Promise<void> {
    await delay(100);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    await delay(200);
    return {
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
    };
  }

  async lookupAuthMethod(email: string): Promise<{ authMethod: 'PASSWORD' | 'MAGIC_CODE' }> {
    await delay(100);
    return { authMethod: 'PASSWORD' };
  }

  async sendMagicCode(email: string): Promise<{ sent: boolean }> {
    await delay(300);
    return { sent: true };
  }

  async verifyMagicCode(email: string, code: string): Promise<{ accessToken: string; refreshToken: string }> {
    await delay(300);
    if (code === '123456') {
      return {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
      };
    }
    throw new Error('Invalid or expired code');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ accessToken: string; refreshToken: string }> {
    await delay(300);
    return {
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
    };
  }
}

// ─── Projects Module Mock ─────────────────────────────────────────────────────

class MockProjectsModule {
  async list(_params?: { includeDeleted?: boolean }): Promise<{ projects: Project[] }> {
    await delay();
    // Return all projects including deleted when includeDeleted is true
    const allProjects = _params?.includeDeleted
      ? mockProjects.map(p => ({ ...p, deletedAt: p.deletedAt ?? (Math.random() > 0.8 ? '2026-06-01T00:00:00Z' : null) }))
      : mockProjects.filter(p => !p.deletedAt);
    return { projects: allProjects };
  }

  async get(projectIdOrSlug: string): Promise<Project> {
    await delay();
    // projectIdOrSlug can be either the project's id (prj_01) or slug (main-website)
    const project = mockProjects.find(p => p.id === projectIdOrSlug || p.slug === projectIdOrSlug);
    if (!project) throw new Error('Project not found');
    return project;
  }

  async create(data: { name: string; type: string; description?: string }): Promise<Project> {
    await delay(400);
    const newProject: Project = {
      id: 'prj_' + Date.now(),
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      type: data.type,
      status: 'active',
      ownerId: 'usr_01',
      role: 'owner',
      description: data.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockProjects.push(newProject);
    return newProject;
  }

  async update(projectId: string, data: Partial<Project>): Promise<Project> {
    await delay(300);
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    Object.assign(project, data, { updatedAt: new Date().toISOString() });
    return project;
  }

  async delete(projectId: string): Promise<void> {
    await delay(300);
    const index = mockProjects.findIndex(p => p.id === projectId);
    if (index === -1) throw new Error('Project not found');
    mockProjects.splice(index, 1);
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    await delay();
    return mockProjectMembers[projectId] || [];
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    await delay();
    return mockProjectMembers[projectId] || [];
  }

  async addMember(projectId: string, email: string, role: string): Promise<ProjectMember> {
    await delay(300);
    const member: ProjectMember = {
      userId: 'usr_' + Date.now(),
      email,
      role,
      joinedAt: new Date().toISOString(),
    };
    if (!mockProjectMembers[projectId]) {
      mockProjectMembers[projectId] = [];
    }
    mockProjectMembers[projectId].push(member);
    return member;
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await delay(200);
    if (mockProjectMembers[projectId]) {
      mockProjectMembers[projectId] = mockProjectMembers[projectId].filter(m => m.userId !== userId);
    }
  }

  async getEnvVars(projectId: string): Promise<EnvVar[]> {
    await delay();
    return mockEnvVars[projectId] || [];
  }

  async setEnvVar(projectId: string, key: string, value: string, encrypted: boolean): Promise<EnvVar> {
    await delay(200);
    const envVar: EnvVar = { key, value: encrypted ? '***' : value, encrypted };
    if (!mockEnvVars[projectId]) mockEnvVars[projectId] = [];
    const existing = mockEnvVars[projectId].findIndex(e => e.key === key);
    if (existing >= 0) {
      mockEnvVars[projectId][existing] = envVar;
    } else {
      mockEnvVars[projectId].push(envVar);
    }
    return envVar;
  }

  async deleteEnvVar(projectId: string, key: string): Promise<void> {
    await delay(200);
    if (mockEnvVars[projectId]) {
      mockEnvVars[projectId] = mockEnvVars[projectId].filter(e => e.key !== key);
    }
  }

  async restore(projectId: string): Promise<Project> {
    await delay(300);
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    project.deletedAt = null;
    return project;
  }

  async requestPurge(projectId: string): Promise<void> {
    await delay(300);
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    // In real impl, this sends a verification email
  }

  async purge(projectId: string, _code: string): Promise<void> {
    await delay(400);
    const index = mockProjects.findIndex(p => p.id === projectId);
    if (index === -1) throw new Error('Project not found');
    mockProjects.splice(index, 1);
  }
}

// ─── Deployments Module Mock ──────────────────────────────────────────────────

class MockDeploymentsModule {
  async list(projectId: string): Promise<Deployment[]> {
    await delay();
    return mockDeployments[projectId] || [];
  }

  async get(projectId: string, deploymentId: string): Promise<Deployment> {
    await delay();
    const deployments = mockDeployments[projectId] || [];
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) throw new Error('Deployment not found');
    return deployment;
  }

  async create(projectId: string, data: Partial<Deployment>): Promise<Deployment> {
    await delay(500);
    const deployment: Deployment = {
      id: 'dep_' + Date.now(),
      projectId,
      releaseId: null,
      status: 'running',
      deploymentUrl: null,
      rolledBackToId: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      version: data.version || '0.0.1',
      commitSha: data.commitSha || 'mock_sha',
      commitMessage: data.commitMessage || 'Mock deployment',
      branch: data.branch || 'main',
      sourceType: 'git',
      createdBy: 'usr_01',
    };
    if (!mockDeployments[projectId]) mockDeployments[projectId] = [];
    mockDeployments[projectId].unshift(deployment);
    return deployment;
  }

  async cancel(projectId: string, deploymentId: string): Promise<Deployment> {
    await delay(300);
    const deployments = mockDeployments[projectId] || [];
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) throw new Error('Deployment not found');
    deployment.status = 'cancelled';
    deployment.completedAt = new Date().toISOString();
    return deployment;
  }

  async rollback(projectId: string, deploymentId: string): Promise<Deployment> {
    await delay(500);
    const deployments = mockDeployments[projectId] || [];
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) throw new Error('Deployment not found');
    const newDeployment: Deployment = {
      ...deployment,
      id: 'dep_' + Date.now(),
      status: 'completed',
      deploymentUrl: deployment.deploymentUrl || null,
      rolledBackToId: deploymentId,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      version: deployment.version + '-rollback',
    };
    deployments.unshift(newDeployment);
    return newDeployment;
  }

  async getLogs(projectId: string, deploymentId: string): Promise<LogEntry[]> {
    await delay();
    return mockLogEntries;
  }

  async stop(projectId: string, deploymentId: string): Promise<Deployment> {
    await delay(300);
    const deployments = mockDeployments[projectId] || [];
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) throw new Error('Deployment not found');
    deployment.status = 'stopped';
    deployment.completedAt = new Date().toISOString();
    return deployment;
  }

  async restart(projectId: string, deploymentId: string): Promise<Deployment> {
    await delay(500);
    const deployments = mockDeployments[projectId] || [];
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) throw new Error('Deployment not found');
    deployment.status = 'pending';
    deployment.completedAt = null;
    return deployment;
  }

  async destroy(projectId: string, deploymentId: string): Promise<void> {
    await delay(300);
    const deployments = mockDeployments[projectId] || [];
    const index = deployments.findIndex(d => d.id === deploymentId);
    if (index === -1) throw new Error('Deployment not found');
    deployments.splice(index, 1);
  }
}

// ─── Storage Module Mock ──────────────────────────────────────────────────────

class MockStorageModule {
  // ── Config ───────────────────────────────────────────────────────────────

  async getStorageConfig(projectId: string): Promise<ProjectStorageConfig> {
    await delay(100);
    return { ...mockProjectStorageConfig, projectId };
  }

  async updateStorageConfig(projectId: string, data: { defaultProvider?: string }): Promise<ProjectStorageConfig> {
    await delay(200);
    if (data.defaultProvider) mockProjectStorageConfig.defaultProvider = data.defaultProvider as ProjectStorageConfig['defaultProvider'];
    mockProjectStorageConfig.updatedAt = new Date().toISOString();
    return { ...mockProjectStorageConfig };
  }

  async setCloudinaryCredentials(
    projectId: string,
    creds: { cloudName: string; apiKey: string; apiSecret: string },
  ): Promise<ProjectStorageConfig> {
    await delay(300);
    void creds;
    mockProjectStorageConfig.cloudinaryCredsSet = true;
    mockProjectStorageConfig.updatedAt = new Date().toISOString();
    return { ...mockProjectStorageConfig };
  }

  async setTelegramCredentials(
    projectId: string,
    creds: { botToken: string; chatId: string },
  ): Promise<ProjectStorageConfig> {
    await delay(300);
    void creds;
    mockProjectStorageConfig.telegramCredsSet = true;
    mockProjectStorageConfig.updatedAt = new Date().toISOString();
    return { ...mockProjectStorageConfig };
  }

  async deleteCredentials(projectId: string, provider: 'cloudinary' | 'telegram'): Promise<ProjectStorageConfig> {
    await delay(200);
    if (provider === 'cloudinary') mockProjectStorageConfig.cloudinaryCredsSet = false;
    if (provider === 'telegram') mockProjectStorageConfig.telegramCredsSet = false;
    mockProjectStorageConfig.updatedAt = new Date().toISOString();
    return { ...mockProjectStorageConfig };
  }

  // ── Buckets ─────────────────────────────────────────────────────────────

  async listBuckets(projectId: string): Promise<StorageBucket[]> {
    await delay(150);
    void projectId;
    return mockStorageBuckets;
  }

  async createBucket(projectId: string, name: string, provider: 'internal' | 'cloudinary' | 'telegram' | 's3' = 'internal'): Promise<StorageBucket> {
    await delay(400);
    void projectId;
    const bucket: StorageBucket = {
      id: 'bucket_' + Date.now(),
      name,
      provider,
      status: 'active',
      sizeBytes: 0,
      objectCount: 0,
      access: 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStorageBuckets.push(bucket);
    return bucket;
  }

  async deleteBucket(projectId: string, bucketId: string): Promise<void> {
    await delay(300);
    void projectId;
    const index = mockStorageBuckets.findIndex(b => b.id === bucketId);
    if (index >= 0) {
      mockStorageBuckets.splice(index, 1);
      delete mockStorageFiles[bucketId];
    }
  }

  // ── Files ────────────────────────────────────────────────────────────────

  async uploadFile(
    projectId: string,
    bucketId: string,
    _file: Buffer | Blob,
    name: string,
    options?: { contentType?: string; key?: string },
  ): Promise<StorageFile> {
    await delay(500);
    void projectId;
    const key = options?.key ?? name;
    const file: StorageFile = {
      id: 'f_' + Date.now(),
      key,
      originalName: name,
      mimeType: options?.contentType ?? 'application/octet-stream',
      sizeBytes: 0,
      etag: 'mock_' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    if (!mockStorageFiles[bucketId]) mockStorageFiles[bucketId] = [];
    mockStorageFiles[bucketId].unshift(file);
    return file;
  }

  async listFiles(
    projectId: string,
    bucketId: string,
    options?: { prefix?: string; page?: number; limit?: number },
  ): Promise<{ files: StorageFile[] }> {
    await delay(150);
    void projectId;
    const all = mockStorageFiles[bucketId] ?? [];
    const prefix = options?.prefix ?? '';
    const filtered = prefix
      ? all.filter(f => f.key.startsWith(prefix))
      : all;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const start = (page - 1) * limit;
    return { files: filtered.slice(start, start + limit) };
  }

  async getFile(projectId: string, bucketId: string, fileId: string): Promise<StorageFile | null> {
    await delay(80);
    void projectId;
    return (mockStorageFiles[bucketId] ?? []).find(f => f.id === fileId) ?? null;
  }

  async deleteFile(projectId: string, bucketId: string, fileId: string): Promise<void> {
    await delay(200);
    void projectId;
    if (!mockStorageFiles[bucketId]) return;
    const idx = mockStorageFiles[bucketId].findIndex(f => f.id === fileId);
    if (idx >= 0) mockStorageFiles[bucketId].splice(idx, 1);
  }

  async getSignedUrl(projectId: string, bucketId: string, fileId: string, expiresIn = 3600): Promise<string> {
    await delay(100);
    void projectId; void bucketId; void fileId; void expiresIn;
    // Return a mock signed URL — in production this would be a real pre-signed URL
    return `/api/v1/storage/${bucketId}/${fileId}?token=mock&expires=${Date.now() + expiresIn * 1000}`;
  }
}

// ─── Databases Module Mock ────────────────────────────────────────────────────

// ─── Mock row generation helpers ────────────────────────────────────────────

const FIRST_NAMES = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Ivy','Jack','Kate','Leo','Mia','Noah','Olivia','Pete','Quinn','Rose','Sam','Tara'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin'];
const PRODUCTS    = ['Wireless Mouse','USB-C Hub','Mechanical Keyboard','Monitor Stand','Webcam HD','Desk Lamp','Laptop Sleeve','Cable Organizer','Mouse Pad','Screen Cleaner','Bluetooth Speaker','Power Bank','HDMI Cable','Webcam Cover','Wrist Rest'];
const STATUSES    = { users: ['active','active','active','suspended','pending'], orders: ['pending','confirmed','shipped','delivered','cancelled'], products: ['true','true','true','false'] };
const DOMAINS     = ['gmail.com','outlook.com','yahoo.com','proton.me','icloud.com'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uuid(): string { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }

function generateDefault(col: ColumnInfo): unknown {
  if (col.isPrimaryKey) return uuid();
  switch (col.type) {
    case 'uuid':         return uuid();
    case 'varchar':
    case 'text':         return col.name.includes('email') ? `user${randInt(1,999)}@${rand(DOMAINS)}` : col.name.includes('name') ? `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}` : 'Sample text';
    case 'boolean':      return Math.random() > 0.2;
    case 'smallint':     return randInt(0, 99);
    case 'integer':      return randInt(1, 1000);
    case 'bigint':       return BigInt(randInt(100, 100_000_00));
    case 'real':
    case 'float4':
    case 'float8':       return parseFloat((Math.random() * 1000).toFixed(2));
    case 'timestamptz':
    case 'timestamp':    return new Date(Date.now() - randInt(0, 90 * 24 * 3600 * 1000)).toISOString();
    case 'date':         return new Date(Date.now() - randInt(0, 365 * 24 * 3600 * 1000)).toISOString().slice(0, 10);
    case 'jsonb':
    case 'json':         return { key: 'value', nested: { a: 1, b: true } };
    case 'inet':         return `192.168.${randInt(1,255)}.${randInt(1,255)}`;
    case 'char':
    case 'varchar(3)':   return 'USD';
    default:             return null;
  }
}

function generateMockRows(tableName: string, cols: ColumnInfo[], limit: number): Record<string, unknown>[] {
  const statuses: Record<string, string[]> = { users: STATUSES.users, orders: STATUSES.orders, products: STATUSES.products, sessions: ['active','expired'], api_keys: ['active','revoked'], audit_log: ['INSERT','UPDATE','DELETE'], realtime_presences: ['online','offline'] };
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < limit; i++) {
    const row: Record<string, unknown> = {};
    for (const col of cols) {
      if (col.name === 'id' && col.type === 'uuid') { row[col.name] = uuid(); continue; }
      if (col.name === 'id' && col.type === 'bigserial') { row[col.name] = BigInt(i + 1); continue; }
      if (col.name === 'created_at' || col.name === 'updated_at' || col.name === 'last_login' || col.name === 'shipped_at' || col.name === 'delivered_at' || col.name === 'expires_at' || col.name === 'last_seen_at' || col.name === 'applied_at') {
        row[col.name] = new Date(Date.now() - randInt(0, 90 * 24 * 3600 * 1000)).toISOString();
        continue;
      }
      if (col.name === 'updated_at') { row[col.name] = new Date().toISOString(); continue; }
      if (col.name === 'avatar_url' || col.name === 'description' || col.name === 'notes' || col.name === 'user_agent') {
        row[col.name] = Math.random() > 0.6 ? `Sample ${col.name} content for row ${i}` : null;
        continue;
      }
      if (col.name === 'shipping_addr' || col.name === 'payload' || col.name === 'old_data' || col.name === 'new_data') {
        row[col.name] = { street: `${randInt(1,999)} Main St`, city: 'San Francisco', state: 'CA', zip: `${randInt(10000,99999)}` };
        continue;
      }
      if (col.name === 'password' || col.name === 'token_hash' || col.name === 'key_hash') {
        row[col.name] = '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
        continue;
      }
      if (col.name === 'password') { row[col.name] = undefined; continue; }
      if (col.name === 'invokedCount') { row[col.name] = randInt(0, 10000); continue; }
      if (col.name === 'avgDuration') { row[col.name] = randInt(50, 5000); continue; }
      if (col.name === 'avgDuration') { row[col.name] = randInt(50, 5000); continue; }
      if (col.type === 'boolean') { row[col.name] = statuses[tableName] ? rand(statuses[tableName]) === 'true' : Math.random() > 0.2; continue; }
      if (col.name === 'role' && tableName === 'users') { row[col.name] = rand(['customer','customer','customer','admin','support']); continue; }
      if (col.name === 'status') { row[col.name] = rand(statuses[tableName] ?? ['active']); continue; }
      if (col.name === 'price_cents' || col.name === 'total_cents' || col.name === 'unit_cents') { row[col.name] = BigInt(randInt(99, 999_00)); continue; }
      if (col.name === 'inventory' || col.name === 'sort_order' || col.name === 'quantity') { row[col.name] = randInt(0, 500); continue; }
      if (col.name === 'is_active') { row[col.name] = Math.random() > 0.1; continue; }
      if (col.name === 'diskSizeMb' || col.name === 'sort_order') { row[col.name] = randInt(1, 100); continue; }
      if (col.name === 'memoryMb' || col.name === 'timeoutSeconds') { row[col.name] = randInt(128, 2048); continue; }
      if (col.name === 'invokedCount' || col.name === 'avgDuration') { row[col.name] = randInt(0, 10000); continue; }
      if (col.name === 'diskSizeMb' || col.name === 'sizeBytes') { row[col.name] = randInt(1_000_000, 100_000_000_000); continue; }
      if (col.name === 'currentConnections' || col.name === 'maxConnections' || col.name === 'connectionLimit') { row[col.name] = randInt(0, 100); continue; }
      row[col.name] = generateDefault(col);
    }
    rows.push(row);
  }
  return rows;
}

// In-memory mutable row store so inserts/updates are reflected
const mockRowsByTable: Record<string, Record<string, unknown>> = {};

function getOrInitRows(table: string): Record<string, unknown> {
  if (!mockRowsByTable[table]) {
    const cols = mockColumns[table] ?? [];
    const generated = generateMockRows(table, cols, 50);
    for (const row of generated) {
      const id = (row['id'] as string) ?? Object.values(row)[0];
      mockRowsByTable[table] ??= {};
      mockRowsByTable[table][String(id)] = row;
    }
  }
  return mockRowsByTable[table];
}


class MockQueryBuilder<T extends Record<string, unknown>> {
  private _table: string;
  private _selects: string[] = ['*'];
  private _filters: Array<{ col: string; op: string; val: unknown }> = [];
  private _orders: Array<{ col: string; dir: string }> = [];
  private _limitVal = 100;
  private _pageVal = 1;

  constructor(table: string) { this._table = table; }

  // select(cols?) with args — configures which columns to return (chainable, non-async)
  select(cols: string[]): MockQueryBuilder<T>;
  // select() with no args — executes the query, matching the real SDK's behavior
  select(): Promise<DataResult<T>>;
  select(cols?: string[]): MockQueryBuilder<T> | Promise<DataResult<T>> {
    if (cols !== undefined) {
      this._selects = cols;
      return this;
    }
    return this.execute();
  }

  eq(col: string, val: unknown): this    { this._filters.push({ col, op: '=',  val }); return this; }
  ne(col: string, val: unknown): this    { this._filters.push({ col, op: '!=', val }); return this; }
  gt(col: string, val: unknown): this     { this._filters.push({ col, op: '>',  val }); return this; }
  gte(col: string, val: unknown): this    { this._filters.push({ col, op: '>=', val }); return this; }
  lt(col: string, val: unknown): this     { this._filters.push({ col, op: '<',  val }); return this; }
  lte(col: string, val: unknown): this    { this._filters.push({ col, op: '<=', val }); return this; }
  like(col: string, val: unknown): this   { this._filters.push({ col, op: 'LIKE', val }); return this; }
  ilike(col: string, val: unknown): this   { this._filters.push({ col, op: 'ILIKE', val }); return this; }
  is(col: string, val: unknown): this     { this._filters.push({ col, op: 'IS', val }); return this; }
  in(col: string, val: unknown): this     { this._filters.push({ col, op: 'IN', val }); return this; }

  order(col: string, dir: 'asc' | 'desc' = 'asc'): this {
    this._orders.push({ col, dir });
    return this;
  }
  limit(n: number): this { this._limitVal = n; return this; }
  page(n: number): this  { this._pageVal = n; return this; }

  async execute(): Promise<DataResult<T>> {
    await delay(80);
    const cols = mockColumns[this._table] ?? [];
    const sampleRows = generateMockRows(this._table, cols, this._limitVal);
    let filtered = sampleRows;
    for (const f of this._filters) {
      filtered = filtered.filter(r => {
        const v = r[f.col];
        switch (f.op) {
          case '=':  return v == f.val;
          case '!=': return v != f.val;
          case '>':  return (v as number) > (f.val as number);
          case '>=': return (v as number) >= (f.val as number);
          case '<':  return (v as number) < (f.val as number);
          case '<=': return (v as number) <= (f.val as number);
          case 'LIKE':  return String(v).toLowerCase().includes(String(f.val).replace('%','').toLowerCase());
          case 'ILIKE': return String(v).toLowerCase().includes(String(f.val).replace('%','').toLowerCase());
          case 'IS':    return v === f.val || (f.val === null && v === null);
          case 'IN':    return (f.val as unknown[]).includes(v);
          default: return true;
        }
      });
    }
    const table = mockSchema.find(t => t.name === this._table);
    return {
      data: filtered as T[],
      count: table?.rowCount ?? filtered.length,
    };
  }

  async insert(data: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    await delay(120);
    const rows = Array.isArray(data) ? data : [data];
    const cols = mockColumns[this._table] ?? [];
    const inserted = rows.map(r => {
      const row: Record<string, unknown> = {};
      for (const col of cols) {
        row[col.name] = r[col.name] ?? generateDefault(col);
      }
      return row as T;
    });
    return Array.isArray(data) ? inserted : inserted[0];
  }

  async update(patch: Partial<T>): Promise<T[]> {
    await delay(100);
    const rows = getOrInitRows(this._table);
    return Object.values(rows as Record<string, unknown>).slice(0, 5).map(r => Object.assign({}, r, patch) as T);
  }

  async delete(): Promise<number> {
    await delay(80);
    return 5;
  }

  watch(): Promise<LiveQueryResult<T>> {
    return Promise.resolve({ data: [] as T[], initial: true });
  }

  subscribe(callback: (event: unknown) => void): Promise<{ unsubscribe: () => void }> {
    let interval: ReturnType<typeof setInterval>;
    let count = 0;
    const types: Array<'INSERT' | 'UPDATE' | 'DELETE'> = ['INSERT', 'UPDATE', 'DELETE'];
    interval = setInterval(() => {
      const type = types[count % 3];
      count++;
      callback({
        eventType: type,
        table: this._table,
        schema: 'public',
        old: type !== 'INSERT' ? { id: uuid() } : {},
        new: type !== 'DELETE' ? { id: uuid(), updated_at: new Date().toISOString() } : {},
        timestamp: new Date().toISOString(),
      });
    }, 5000);
    return Promise.resolve({
      unsubscribe: () => clearInterval(interval),
    });
  }
}

// ─── Mock DatabaseProvider ────────────────────────────────────────────────────

class MockDatabaseProvider {
  private _dbId: string;

  constructor(dbId: string) { this._dbId = dbId; }

  async schema(): Promise<TableInfo[]> {
    await delay(150);
    return mockSchema;
  }

  async columns(table: string): Promise<ColumnInfo[]> {
    await delay(80);
    return mockColumns[table] ?? [];
  }

  async indexes(table: string): Promise<IndexInfo[]> {
    await delay(80);
    return mockIndexes[table] ?? [];
  }

  async constraints(table: string): Promise<ConstraintInfo[]> {
    await delay(80);
    return mockConstraints[table] ?? [];
  }

  async query<T = Record<string, unknown>>(sql: string, _params?: unknown[]): Promise<QueryResult> {
    await delay(Math.random() * 200 + 80);
    const start = Date.now();
    const sqlLower = sql.trim().toLowerCase();

    // SELECT query
    if (sqlLower.startsWith('select')) {
      const colMatch = sql.match(/select\s+(.+?)\s+from\s+(\w+)/i);
      const tableName = colMatch?.[2] ?? 'users';
      const cols = mockColumns[tableName] ?? mockColumns['users'] ?? [];
      const rows = generateMockRows(tableName, cols, 20);
      const columns = cols.map(c => c.name);
      return { columns, rows: rows as Record<string, unknown>[], rowCount: rows.length, executionTimeMs: Date.now() - start };
    }

    // INSERT / UPDATE / DELETE
    if (sqlLower.startsWith('insert') || sqlLower.startsWith('update') || sqlLower.startsWith('delete')) {
      return { columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - start };
    }

    // DDL
    return { columns: ['status'], rows: [{ status: 'ok' }], rowCount: 1, executionTimeMs: Date.now() - start };
  }

  async status(): Promise<Record<string, unknown>> {
    await delay(100);
    const db = mockDatabases.find(d => d.id === this._dbId);
    return {
      healthy: db?.status === 'healthy',
      currentConnections: db?.currentConnections ?? 0,
      maxConnections: db?.maxConnections ?? 100,
      region: db?.region ?? 'us-east-1',
      version: db?.version ?? '16.3',
      uptimeSeconds: 1_234_567,
      totalSizeMb: db?.diskSizeMb ?? 10_240,
    };
  }

  async connection(): Promise<Record<string, unknown>> {
    await delay(80);
    const db = mockDatabases.find(d => d.id === this._dbId);
    return {
      host: `db.${this._dbId}.internal`,
      port: 5432,
      database: db?.name ?? 'postgres',
      user: 'postgres',
      password: '••••••••',
      connectionString: `postgres://postgres:••••••@db.${this._dbId}.internal:5432/${db?.name ?? 'postgres'}`,
      poolSize: db?.maxConnections ?? 100,
      ssl: true,
    };
  }

  async rotatePassword(): Promise<{ password: string }> {
    await delay(600);
    const pw = 'pg_' + Math.random().toString(36).slice(2, 14);
    return { password: pw };
  }

  async migrations(): Promise<MigrationRecord[]> {
    await delay(120);
    return mockMigrations;
  }

  async applyMigration(sql: string, name?: string): Promise<MigrationRecord> {
    await delay(500);
    const record: MigrationRecord = {
      id: 'mig_' + Date.now(),
      name: name ?? 'unnamed_migration',
      status: 'applied',
      appliedAt: new Date().toISOString(),
      version: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    };
    mockMigrations.push(record);
    return record;
  }

  async realtimeTables(): Promise<{ schema: string; table: string; subscribers: number }[]> {
    await delay(80);
    return [
      { schema: 'public', table: 'users',      subscribers: 2 },
      { schema: 'public', table: 'orders',     subscribers: 1 },
      { schema: 'public', table: 'products',   subscribers: 3 },
      { schema: 'public', table: 'order_items', subscribers: 0 },
      { schema: 'public', table: 'audit_log',  subscribers: 1 },
    ];
  }

  async backups(): Promise<BackupRecord[]> {
    await delay(100);
    return mockBackups;
  }

  async createBackup(): Promise<BackupRecord> {
    await delay(300);
    const bk: BackupRecord = {
      id: 'bk_' + Date.now(),
      status: 'in_progress',
      sizeBytes: 0,
      createdAt: new Date().toISOString(),
      type: 'manual',
    };
    mockBackups.push(bk);
    return bk;
  }

  from<T extends Record<string, unknown>>(table: string): MockQueryBuilder<T> {
    return new MockQueryBuilder<T>(table);
  }

  subscribeToTable(
    _table: string,
    callback: (event: { eventType: string; table: string; schema: string; old: Record<string, unknown>; new: Record<string, unknown>; timestamp: string }) => void,
    _opts?: { eventTypes?: string[]; columns?: string[] },
  ): () => void {
    let interval: ReturnType<typeof setInterval>;
    let count = 0;
    const types: Array<'INSERT' | 'UPDATE' | 'DELETE'> = ['INSERT', 'UPDATE', 'DELETE'];
    interval = setInterval(() => {
      const type = types[count % 3];
      count++;
      callback({
        eventType: type,
        table: _table,
        schema: 'public',
        old: type !== 'INSERT' ? { id: '123e4567-e89b-12d3-a456-426614174000' } : {},
        new: type !== 'DELETE' ? { id: '123e4567-e89b-12d3-a456-426614174000', updated_at: new Date().toISOString() } : {},
        timestamp: new Date().toISOString(),
      });
    }, 4000);
    return () => clearInterval(interval);
  }
}

// ─── Databases Module Mock ────────────────────────────────────────────────────

class MockDatabasesModule {
  async list(projectId: string): Promise<Database[]> {
    await delay();
    return mockDatabases.filter(d => d.projectId === projectId);
  }

  async get(databaseId: string): Promise<Database> {
    await delay();
    const db = mockDatabases.find(d => d.id === databaseId);
    if (!db) throw new Error('Database not found');
    return db;
  }

  async create(projectId: string, data: { name: string; type: string; mode?: string; region?: string }): Promise<Database> {
    await delay(600);
    const db: Database = {
      id: 'db_' + Date.now(),
      name: data.name,
      type: data.type ?? 'postgres',
      version: '16.3',
      status: 'creating',
      mode: (data.mode as Database['mode']) ?? 'single',
      region: data.region ?? 'us-east-1',
      projectId,
      diskSizeMb: 10_240,
      maxConnections: 50,
      currentConnections: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDatabases.push(db);
    return db;
  }

  async delete(databaseId: string): Promise<void> {
    await delay(400);
    const index = mockDatabases.findIndex(d => d.id === databaseId);
    if (index >= 0) mockDatabases.splice(index, 1);
  }

  async backup(databaseId: string): Promise<{ backupId: string }> {
    await delay(200);
    const id = 'bk_' + Date.now();
    mockBackups.unshift({
      id, status: 'in_progress', sizeBytes: 0,
      createdAt: new Date().toISOString(), storageBucket: 'db-backups',
      type: 'manual' as const,
    });
    return { backupId: id };
  }

  async listBackups(databaseId: string): Promise<{ backups: BackupRecord[] }> {
    await delay(200);
    return { backups: mockBackups };
  }

  async restore(databaseId: string, backupId: string): Promise<void> {
    await delay(800);
    const backup = mockBackups.find(b => b.id === backupId);
    if (!backup) throw new Error('Backup not found');
    if (backup.status !== 'completed') throw new Error('Backup is not completed');
    // Simulate restore
  }

  async getBackupSchedule(databaseId: string): Promise<BackupSchedule | null> {
    await delay(150);
    return mockBackupSchedules[0] ?? null;
  }

  async updateBackupSchedule(databaseId: string, schedule: Partial<BackupSchedule> & { frequency: string }): Promise<BackupSchedule> {
    await delay(200);
    const existing = mockBackupSchedules.find(s => s.id === (schedule as { id?: string }).id);
    if (existing) {
      Object.assign(existing, schedule);
      return existing;
    }
    const created: BackupSchedule = {
      id: 'bs_' + Date.now(),
      enabled: schedule.enabled ?? true,
      frequency: schedule.frequency as BackupSchedule['frequency'],
      timeUtc: schedule.timeUtc ?? '02:00',
      retentionCount: schedule.retentionCount ?? 7,
      storageBucket: schedule.storageBucket ?? 'db-backups',
      createdAt: new Date().toISOString(),
    };
    mockBackupSchedules.push(created);
    return created;
  }

  async getBackupSettings(databaseId: string): Promise<{ defaultBucket: string; maxManualBackups: number; autoBackupRetentionDays: number }> {
    await delay(100);
    return { defaultBucket: 'db-backups', maxManualBackups: 50, autoBackupRetentionDays: 7 };
  }

  async getConnection(databaseId: string, poolOnly = false): Promise<{ host: string; port: number; database: string; username: string; connectionString: string; pgbouncerHost?: string; pgbouncerPort?: number }> {
    await delay(80);
    const db = mockDatabases.find(d => d.id === databaseId);
    return {
      host: `db.${databaseId}.internal`,
      port: 5432,
      database: db?.name ?? 'postgres',
      username: 'postgres',
      connectionString: `postgres://postgres:••••••@db.${databaseId}.internal:5432/${db?.name ?? 'postgres'}`,
      ...(poolOnly ? { pgbouncerHost: 'pgbouncer.internal', pgbouncerPort: 6432 } : {}),
    };
  }

  async updateSsl(databaseId: string, ssl: boolean): Promise<void> {
    await delay(200);
    void databaseId; void ssl;
  }

  database(id: string): MockDatabaseProvider {
    return new MockDatabaseProvider(id);
  }
}

// ─── Domains Module Mock ──────────────────────────────────────────────────────

class MockDomainsModule {
  async list(): Promise<DomainInfo[]> {
    await delay();
    return mockDomains;
  }

  async add(domain: string): Promise<DomainInfo> {
    await delay(500);
    const domainInfo: DomainInfo = {
      id: 'dom_' + Date.now(),
      domain,
      status: 'pending',
      sslStatus: 'pending',
      addedAt: new Date().toISOString(),
    };
    mockDomains.push(domainInfo);
    return domainInfo;
  }

  async remove(domainId: string): Promise<void> {
    await delay(300);
    const index = mockDomains.findIndex(d => d.id === domainId);
    if (index >= 0) mockDomains.splice(index, 1);
  }

  async getHealth(_projectId: string, _domainId: string): Promise<DomainHealth | null> {
    await delay(200);
    return { ...mockDomainHealth, checkedAt: new Date().toISOString() };
  }

  async triggerHealthCheck(_projectId: string, _domainId: string): Promise<{ status: string; message: string }> {
    await delay(100);
    return { status: 'checking', message: 'Health check triggered' };
  }

  async getDnsRecords(_projectId: string, domainId: string): Promise<{ domainId: string; domain: string; records: DnsRecord[] }> {
    await delay(300);
    const domain = mockDomains.find(d => d.id === domainId);
    return {
      domainId,
      domain: domain?.domain ?? 'unknown.dev',
      records: mockDnsRecords,
    };
  }

  async autoConfigureDnsRecords(_projectId: string, _domainId: string): Promise<{ success: boolean }> {
    await delay(800);
    return { success: true };
  }

  async getSsl(_projectId: string, _domainId: string): Promise<DomainSslInfo> {
    await delay(200);
    return { ...mockDomainSsl };
  }

  async renewSsl(_projectId: string, _domainId: string): Promise<{ status: string; message: string }> {
    await delay(500);
    return { status: 'renewing', message: 'SSL renewal initiated' };
  }

  async reissueSsl(_projectId: string, _domainId: string): Promise<{ status: string; message: string }> {
    await delay(500);
    return { status: 'reissuing', message: 'SSL reissue initiated' };
  }

  async getHistory(_projectId: string, _domainId: string): Promise<DomainVerificationRun[]> {
    await delay(200);
    return mockDomainVerificationRuns;
  }

  async getIncidents(_projectId: string, _domainId: string): Promise<DomainIncident[]> {
    await delay(200);
    return mockDomainIncidents;
  }

  async getHealthTimeline(_projectId: string, _domainId: string, _days = 30): Promise<DomainHealthTimelineEntry[]> {
    await delay(200);
    return mockDomainHealthTimeline;
  }
}

// ─── Email Module Mock ────────────────────────────────────────────────────────

class MockEmailModule {
  async listDomains(_projectId: string): Promise<{
    id: string;
    domain: string;
    status: string;
    dkimVerified: boolean;
    spfVerified: boolean;
    dmarcVerified: boolean;
    mxVerified: boolean;
  }[]> {
    await delay();
    return [
      { id: 'emldom_01', domain: 'fidscript.dev', status: 'ACTIVE', dkimVerified: true, spfVerified: true, dmarcVerified: true, mxVerified: true },
      { id: 'emldom_02', domain: 'example.com', status: 'PENDING', dkimVerified: false, spfVerified: true, dmarcVerified: false, mxVerified: true },
    ];
  }

  async createDomain(_projectId: string, domain: string): Promise<{
    id: string;
    domain: string;
    status: string;
    dkimVerified: boolean;
    spfVerified: boolean;
    dmarcVerified: boolean;
    mxVerified: boolean;
  }> {
    await delay(500);
    return { id: 'emldom_' + Date.now(), domain, status: 'PENDING', dkimVerified: false, spfVerified: false, dmarcVerified: false, mxVerified: false };
  }

  async listMailboxes(domain: string): Promise<{ email: string; name: string; quota: number; used: number }[]> {
    await delay();
    return [
      { email: `admin@${domain}`, name: 'Admin', quota: 10737418240, used: 536870912 },
      { email: `support@${domain}`, name: 'Support', quota: 10737418240, used: 107374182 },
    ];
  }

  async createMailbox(domain: string, email: string, name: string): Promise<void> {
    await delay(400);
  }

  async deleteMailbox(email: string): Promise<void> {
    await delay(300);
  }
}

// ─── Functions Module Mock ────────────────────────────────────────────────────

class MockFunctionsModule {
  async list(projectId: string): Promise<Function_[]> {
    await delay();
    return mockFunctions.filter(f => !projectId || f.projectId === projectId);
  }

  async get(projectId: string, functionId: string): Promise<Function_> {
    await delay();
    const fn = mockFunctions.find(f => f.id === functionId && (!projectId || f.projectId === projectId));
    if (!fn) throw new Error('Function not found');
    return fn;
  }

  async create(projectId: string, data: { name: string; runtime: string; memoryMb?: number; timeoutSeconds?: number }): Promise<Function_> {
    await delay(400);
    const fn: Function_ = {
      id: 'fn_' + Date.now(),
      name: data.name,
      runtime: data.runtime,
      status: 'BUILDING',
      projectId,
      memoryMb: data.memoryMb ?? 256,
      timeoutSeconds: data.timeoutSeconds ?? 30,
      envVars: {},
      currentVersion: undefined,
      invokedCount: 0,
      avgDuration: 0,
      lastInvokedAt: null,
      createdAt: new Date().toISOString(),
    };
    mockFunctions.push(fn);
    mockFunctionVersions[fn.id] = [];
    mockFunctionCode[fn.id] = { version: '', code: '' };
    mockFunctionLogs[fn.id] = [];
    return fn;
  }

  async update(projectId: string, functionId: string, data: { memoryMb?: number; timeoutSeconds?: number; currentVersion?: string; envVars?: Record<string, string> }): Promise<Function_> {
    await delay(300);
    const fn = mockFunctions.find(f => f.id === functionId && (!projectId || f.projectId === projectId));
    if (!fn) throw new Error('Function not found');
    // Only assign SDK-allowed fields — reject extra fields silently
    if (data.memoryMb !== undefined) fn.memoryMb = data.memoryMb;
    if (data.timeoutSeconds !== undefined) fn.timeoutSeconds = data.timeoutSeconds;
    if (data.currentVersion !== undefined) fn.currentVersion = data.currentVersion;
    if (data.envVars !== undefined) fn.envVars = { ...fn.envVars, ...data.envVars };
    return fn;
  }

  async delete(projectId: string, functionId: string): Promise<void> {
    await delay(300);
    const idx = mockFunctions.findIndex(f => f.id === functionId && (!projectId || f.projectId === projectId));
    if (idx === -1) throw new Error('Function not found');
    mockFunctions.splice(idx, 1);
  }

  async deploy(projectId: string, functionId: string, code: string, version?: string): Promise<{ status: string }> {
    await delay(600);
    const fn = mockFunctions.find(f => f.id === functionId && (!projectId || f.projectId === projectId));
    if (!fn) throw new Error('Function not found');
    const ver = version ?? '1.0.0';
    fn.status = 'ACTIVE';
    fn.currentVersion = 'v' + ver;
    fn.lastInvokedAt = new Date().toISOString();
    if (!mockFunctionVersions[fn.id]) mockFunctionVersions[fn.id] = [];
    mockFunctionVersions[fn.id].unshift({ version: ver, createdAt: new Date().toISOString(), status: 'ACTIVE' });
    mockFunctionCode[fn.id] = { version: ver, code };
    if (!mockFunctionLogs[fn.id]) mockFunctionLogs[fn.id] = [];
    mockFunctionLogs[fn.id].unshift({ id: 'fl_' + Date.now(), timestamp: new Date().toISOString(), level: 'info', message: `Deployed version v${ver}` });
    return { status: 'ACTIVE' };
  }

  async listVersions(projectId: string, functionId: string): Promise<FunctionVersionInfo[]> {
    await delay();
    return mockFunctionVersions[functionId] ?? [];
  }

  async getCode(projectId: string, functionId: string, version?: string): Promise<{ code: string | null; versioned: boolean }> {
    await delay();
    const info = mockFunctionCode[functionId];
    if (!info) return { code: null, versioned: false };
    // If a specific version is requested and we have it, return that snapshot
    if (version && info.versionedCodes?.[version]) {
      return { code: info.versionedCodes[version], versioned: true };
    }
    // Fall back to current code
    if (info.code) return { code: info.code, versioned: true };
    return { code: null, versioned: false };
  }

  async invoke(projectId: string, functionId: string, payload?: unknown): Promise<{ result: unknown }> {
    await delay(200);
    const fn = mockFunctions.find(f => f.id === functionId && (!projectId || f.projectId === projectId));
    if (!fn) throw new Error('Function not found');
    fn.invokedCount = (fn.invokedCount ?? 0) + 1;
    fn.lastInvokedAt = new Date().toISOString();
    if (!mockFunctionLogs[fn.id]) mockFunctionLogs[fn.id] = [];
    mockFunctionLogs[fn.id].unshift({ id: 'fl_' + Date.now(), timestamp: new Date().toISOString(), level: 'info', message: `Invoked with payload: ${JSON.stringify(payload ?? {})}` });
    return { result: { success: true, functionId: fn.id, payload, timestamp: new Date().toISOString() } };
  }

  async getLogs(projectId: string, functionId: string, limit = 50): Promise<{ logs: { id: string; timestamp: string; level: string; message: string }[] }> {
    await delay();
    const logs = (mockFunctionLogs[functionId] ?? mockLogEntries.slice(0, 3)).slice(0, limit);
    return { logs };
  }

  streamLogs(_projectId: string, _functionId: string): AsyncGenerator<{ id: string; timestamp: string; level: string; message: string }, void, unknown> {
    // No-op for mock — caller should use getLogs
    return (async function* () {})();
  }
}

// ─── Queues Module Mock ───────────────────────────────────────────────────────

class MockQueuesModule {
  private queueStats: Record<string, { pending: number; delivered: number; deadLettered: number; jsDepth: number }> = {
    'q_01': { pending: 12, delivered: 843, deadLettered: 2, jsDepth: 12 },
    'q_02': { pending: 5, delivered: 120, deadLettered: 0, jsDepth: 5 },
    'q_03': { pending: 0, delivered: 55, deadLettered: 3, jsDepth: 0 },
  };
  private queueMessages: Record<string, QueueMessage[]> = {
    'q_01': [
      { id: 'msg_1', body: '{"type":"email","to":"alice@example.com","subject":"Welcome!"}', status: 'delivered', attempts: 1, createdAt: '2026-06-29T10:00:00Z' },
      { id: 'msg_2', body: '{"type":"notification","userId":"usr_01","message":"New order placed"}', status: 'pending', attempts: 0, createdAt: '2026-06-29T10:05:00Z' },
      { id: 'msg_3', body: '{"type":"email","to":"bob@example.com","subject":"Reset password"}', status: 'pending', attempts: 2, createdAt: '2026-06-29T09:30:00Z' },
    ],
    'q_02': [
      { id: 'msg_4', body: '{"imageId":"img_123","operation":"resize","width":800,"height":600}', status: 'pending', attempts: 0, createdAt: '2026-06-29T11:00:00Z' },
      { id: 'msg_5', body: '{"imageId":"img_456","operation":"compress","quality":80}', status: 'delivered', attempts: 1, createdAt: '2026-06-29T10:55:00Z' },
    ],
    'q_03': [
      { id: 'msg_6', body: '{"type":"push","userId":"usr_03","message":"Payment received"}', status: 'dead-letter', attempts: 3, createdAt: '2026-06-28T08:00:00Z' },
    ],
  };

  async list(_projectId: string): Promise<Queue[]> {
    await delay();
    return mockQueues;
  }

  async get(_projectId: string, queueId: string): Promise<Queue> {
    await delay();
    const queue = mockQueues.find(q => q.id === queueId);
    if (!queue) throw new Error('Queue not found');
    return queue;
  }

  async create(_projectId: string, data: { name: string; type?: string }): Promise<Queue> {
    await delay(400);
    const queue: Queue = {
      id: 'q_' + Date.now(),
      name: data.name,
      type: data.type ?? 'jetstream',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    mockQueues.push(queue);
    this.queueStats[queue.id] = { pending: 0, delivered: 0, deadLettered: 0, jsDepth: 0 };
    this.queueMessages[queue.id] = [];
    mockEmitQueueEvent('queues.created', { queueId: queue.id, projectId: _projectId, name: queue.name, type: queue.type });
    return queue;
  }

  async delete(_projectId: string, queueId: string): Promise<void> {
    await delay(300);
    const queue = mockQueues.find(q => q.id === queueId);
    const idx = mockQueues.findIndex(q => q.id === queueId);
    if (idx >= 0) mockQueues.splice(idx, 1);
    delete this.queueStats[queueId];
    delete this.queueMessages[queueId];
    if (queue) mockEmitQueueEvent('queues.deleted', { queueId, projectId: _projectId, name: queue.name });
  }

  async publish(_projectId: string, queueId: string, body: string | object, _headers?: Record<string, string>): Promise<void> {
    await delay(200);
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const msg: QueueMessage = {
      id: 'msg_' + Date.now(),
      body: bodyStr,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    if (!this.queueMessages[queueId]) this.queueMessages[queueId] = [];
    this.queueMessages[queueId].unshift(msg);
    if (this.queueStats[queueId]) this.queueStats[queueId].pending++;
    mockEmitQueueEvent('queues.message.published', { queueId, projectId: _projectId, messageId: msg.id });
  }

  async consume(_projectId: string, queueId: string, maxMessages = 10, _timeoutSeconds = 30): Promise<QueueMessage[]> {
    await delay(150);
    return (this.queueMessages[queueId] ?? []).slice(0, maxMessages);
  }

  async getMessages(_projectId: string, queueId: string, opts?: { status?: string; limit?: number; cursor?: string }): Promise<{ messages: QueueMessage[]; nextCursor: string | null }> {
    await delay(100);
    let msgs = this.queueMessages[queueId] ?? [];
    if (opts?.status) msgs = msgs.filter(m => m.status === opts.status);
    const limit = opts?.limit ?? 50;
    const cursor = opts?.cursor ? parseInt(opts.cursor) : 0;
    return { messages: msgs.slice(cursor, cursor + limit), nextCursor: null };
  }

  async ack(_projectId: string, queueId: string, messageIds: string[]): Promise<void> {
    await delay(150);
    for (const id of messageIds) {
      const idx = (this.queueMessages[queueId] ?? []).findIndex(m => m.id === id);
      if (idx >= 0) {
        this.queueMessages[queueId].splice(idx, 1);
        if (this.queueStats[queueId]) {
          this.queueStats[queueId].pending = Math.max(0, this.queueStats[queueId].pending - 1);
          this.queueStats[queueId].delivered++;
        }
      }
    }
    mockEmitQueueEvent('queues.message.acknowledged', { queueId, projectId: _projectId, messageIds });
  }

  async retry(_projectId: string, queueId: string, messageIds: string[]): Promise<void> {
    await delay(150);
    for (const id of messageIds) {
      const msg = (this.queueMessages[queueId] ?? []).find(m => m.id === id);
      if (msg) { msg.status = 'pending'; msg.attempts = 0; }
    }
    mockEmitQueueEvent('queues.message.retried', { queueId, projectId: _projectId, messageIds });
  }

  async getStats(_projectId: string, queueId: string) {
    await delay(80);
    const s = this.queueStats[queueId] ?? { pending: 0, delivered: 0, deadLettered: 0, jsDepth: 0 };
    return {
      queueId,
      pending: s.pending,
      delivered: s.delivered,
      acknowledged: s.delivered,
      failed: s.deadLettered,
      deadLettered: s.deadLettered,
      jsDepth: s.jsDepth,
      total: s.pending + s.delivered + s.deadLettered,
    };
  }

  async purge(_projectId: string, queueId: string, includeDlq = false): Promise<{ purged: number; dlqPurged: number }> {
    await delay(300);
    let purged = 0; let dlqPurged = 0;
    if (this.queueMessages[queueId]) {
      if (includeDlq) {
        dlqPurged = this.queueMessages[queueId].filter(m => m.status === 'dead-letter').length;
        this.queueMessages[queueId] = this.queueMessages[queueId].filter(m => m.status !== 'dead-letter');
      } else {
        purged = this.queueMessages[queueId].length;
        this.queueMessages[queueId] = [];
      }
    }
    return { purged, dlqPurged };
  }
}

// ─── Cron Module Mock ─────────────────────────────────────────────────────────

class MockCronModule {
  async list(projectId: string): Promise<CronJob[]> {
    await delay();
    return mockCronJobs.filter(j => j.projectId === projectId);
  }

  async get(projectId: string, jobId: string): Promise<CronJob> {
    await delay();
    const job = mockCronJobs.find(j => j.id === jobId && j.projectId === projectId);
    if (!job) throw new Error('Cron job not found');
    return job;
  }

  async create(projectId: string, data: Partial<CronJob>): Promise<CronJob> {
    await delay(400);
    const job: CronJob = {
      id: 'cron_' + Date.now(),
      projectId,
      name: data.name || 'New Cron Job',
      cronExpression: data.cronExpression || '0 * * * *',
      timezone: data.timezone || 'UTC',
      targetType: data.functionId ? 'function' : 'endpoint',
      endpoint: data.endpoint,
      functionId: data.functionId,
      payload: data.payload ?? {},
      enabled: data.enabled ?? true,
      retryAttempts: data.retryAttempts ?? 3,
      retryDelaySeconds: data.retryDelaySeconds ?? 60,
      timeoutSeconds: data.timeoutSeconds ?? 300,
      state: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCronJobs.push(job);
    return job;
  }

  async update(projectId: string, jobId: string, data: Partial<CronJob>): Promise<CronJob> {
    await delay(300);
    const job = mockCronJobs.find(j => j.id === jobId && j.projectId === projectId);
    if (!job) throw new Error('Cron job not found');
    Object.assign(job, data, { updatedAt: new Date().toISOString() });
    return job;
  }

  async delete(projectId: string, jobId: string): Promise<void> {
    await delay(300);
    const index = mockCronJobs.findIndex(j => j.id === jobId && j.projectId === projectId);
    if (index >= 0) mockCronJobs.splice(index, 1);
  }

  async trigger(projectId: string, jobId: string): Promise<void> {
    await delay(300);
    const job = mockCronJobs.find(j => j.id === jobId && j.projectId === projectId);
    if (!job) throw new Error('Cron job not found');
  }

  async runNow(projectId: string, jobId: string): Promise<CronJobRun> {
    await delay(500);
    const now = new Date().toISOString();
    return {
      id: 'run_' + Date.now(),
      cronJobId: jobId,
      status: 'completed',
      attempt: 1,
      scheduledAt: now,
      startedAt: now,
      completedAt: new Date().toISOString(),
      createdAt: now,
    };
  }

  async getRuns(projectId: string, jobId: string, _limit = 50): Promise<CronJobRun[]> {
    await delay();
    return [
      { id: 'run_01', cronJobId: jobId, status: 'completed', attempt: 1, scheduledAt: '2026-06-29T02:00:00Z', startedAt: '2026-06-29T02:00:00Z', completedAt: '2026-06-29T02:05:00Z', durationMs: 5000, failureType: 'none', createdAt: '2026-06-29T02:00:00Z' },
      { id: 'run_02', cronJobId: jobId, status: 'failed', attempt: 1, scheduledAt: '2026-06-28T02:00:00Z', startedAt: '2026-06-28T02:00:00Z', completedAt: '2026-06-28T02:03:00Z', durationMs: 180000, errorMessage: 'Connection timeout', failureType: 'network_error', createdAt: '2026-06-28T02:00:00Z' },
      { id: 'run_03', cronJobId: jobId, status: 'completed', attempt: 1, scheduledAt: '2026-06-27T02:00:00Z', startedAt: '2026-06-27T02:00:00Z', completedAt: '2026-06-27T02:04:30Z', durationMs: 4500, failureType: 'none', createdAt: '2026-06-27T02:00:00Z' },
      { id: 'run_04', cronJobId: jobId, status: 'completed', attempt: 1, scheduledAt: '2026-06-26T02:00:00Z', startedAt: '2026-06-26T02:00:00Z', completedAt: '2026-06-26T02:03:55Z', durationMs: 4550, failureType: 'none', createdAt: '2026-06-26T02:00:00Z' },
      { id: 'run_05', cronJobId: jobId, status: 'completed', attempt: 1, scheduledAt: '2026-06-25T02:00:00Z', startedAt: '2026-06-25T02:00:00Z', completedAt: '2026-06-25T02:04:10Z', durationMs: 4700, failureType: 'none', createdAt: '2026-06-25T02:00:00Z' },
    ];
  }

  async getNextRun(projectId: string, jobId: string): Promise<{ nextRunAt: string | null }> {
    await delay();
    const job = mockCronJobs.find(j => j.id === jobId && j.projectId === projectId);
    return { nextRunAt: job?.nextRunAt ?? null };
  }

  async simulate(projectId: string, jobId: string, count = 5): Promise<{ scheduledAt: string }[]> {
    await delay();
    const job = mockCronJobs.find(j => j.id === jobId && j.projectId === projectId);
    if (!job) throw new Error('Cron job not found');
    const now = new Date();
    const results: { scheduledAt: string }[] = [];
    for (let i = 0; i < count; i++) {
      const next = new Date(now.getTime() + (i + 1) * 3600_000);
      results.push({ scheduledAt: next.toISOString() });
    }
    void job;
    return results;
  }

  async simulateExpression(projectId: string, cronExpression: string, timezone = 'UTC', count = 5): Promise<{ scheduledAt: string }[]> {
    await delay();
    void projectId; void cronExpression; void timezone;
    const now = new Date();
    const results: { scheduledAt: string }[] = [];
    for (let i = 0; i < count; i++) {
      const next = new Date(now.getTime() + (i + 1) * 3600_000);
      results.push({ scheduledAt: next.toISOString() });
    }
    return results;
  }

  async stats(projectId: string, jobId: string): Promise<{
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  }> {
    await delay();
    const runs = await this.getRuns(projectId, jobId);
    const completed = runs.filter(r => r.status === 'completed').length;
    const durations = runs.filter(r => r.durationMs != null).map(r => r.durationMs!);
    return {
      total: runs.length,
      completed,
      failed: runs.filter(r => r.status === 'failed').length,
      successRate: runs.length > 0 ? Math.round((completed / runs.length) * 100) : null,
      avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      sparkline: runs.map(r => ({ status: r.status, durationMs: r.durationMs ?? null })),
    };
  }

  async replay(projectId: string, jobId: string, runId: string): Promise<{ runId: string; replayedFrom: string; status: string }> {
    await delay();
    const newRunId = `run_replay_${Date.now()}`;
    void projectId; void jobId; void runId;
    return { runId: newRunId, replayedFrom: runId, status: 'enqueued' };
  }
}

// ─── Shared mock event bus ────────────────────────────────────────────────────

/** Module-level event bus so MockQueuesModule can fire events that
 *  MockRealtimeModule.subscribeQueues() picks up. */
const mockQueueEventHandlers: Record<string, Set<(event: unknown) => void>> = {};
function mockEmitQueueEvent(type: string, metadata: unknown) {
  const handlers = mockQueueEventHandlers[type];
  if (handlers) for (const h of handlers) h({ type, metadata, timestamp: new Date().toISOString() });
}

// ─── Realtime Module Mock ─────────────────────────────────────────────────────

class MockRealtimeModule {
  async listChannels(): Promise<{ name: string; subscriberCount: number }[]> {
    await delay();
    return [
      { name: 'deployment-events', subscriberCount: 5 },
      { name: 'user-activity', subscriberCount: 12 },
    ];
  }

  async publish(channel: string, event: string, data: unknown): Promise<void> {
    await delay(100);
  }

  async connect(_token: string, _projectId: string): Promise<void> {
    await delay(100);
  }

  disconnect(): void {
    // no-op for mock
  }

  subscribeDeployments(_projectId: string, _handler: (event: unknown) => void): () => void {
    // Return unsubscribe function
    return () => {};
  }

  subscribeFunctions(_projectId: string, _handler: (event: unknown) => void): () => void {
    // Return unsubscribe function
    return () => {};
  }

  subscribeProject(_projectId: string, _handler: (event: unknown) => void): () => void {
    // Return unsubscribe function
    return () => {};
  }

  subscribeQueues(_projectId: string): {
    on(event: string, handler: (data: unknown) => void): void;
    off(event: string, handler: (data: unknown) => void): void;
    unsubscribe(): void;
  } {
    const handlers: Record<string, Set<(data: unknown) => void>> = {};
    // Register on the shared mock bus so queue operations trigger events.
    const registerToBus = (event: string) => {
      if (!mockQueueEventHandlers[event]) mockQueueEventHandlers[event] = new Set();
      mockQueueEventHandlers[event].add((eventData) => {
        for (const h of handlers[event] ?? []) h(eventData);
        // Also deliver to '*' catch-all handlers
        for (const h of handlers['*'] ?? []) h(eventData);
      });
    };
    ['*', 'queues.created', 'queues.updated', 'queues.deleted',
      'queues.message.published', 'queues.message.acknowledged', 'queues.message.retried',
      'queues.message.dead_lettered', 'queues.message.purged',
      'queues.invocation.succeeded', 'queues.invocation.failed'
    ].forEach(registerToBus);

    const on = (event: string, handler: (data: unknown) => void) => {
      if (!handlers[event]) handlers[event] = new Set();
      handlers[event].add(handler);
    };
    const off = (event: string, handler: (data: unknown) => void) => {
      handlers[event]?.delete(handler);
    };
    const unsubscribe = () => {
      for (const h of Object.values(handlers)) h.clear();
      // Remove from bus
      for (const event of Object.keys(mockQueueEventHandlers)) {
        // Note: we can't easily remove individual handlers from bus without keeping refs,
        // so unsubscribe just stops local delivery. In mock mode this is fine.
      }
    };
    return { on, off, unsubscribe };
  }
}

// ─── Monitoring Module Mock ───────────────────────────────────────────────────

class MockMonitoringModule {
  async listAlerts(): Promise<Alert[]> {
    await delay();
    return mockAlerts;
  }

  async getAlert(alertId: string): Promise<Alert> {
    await delay();
    const alert = mockAlerts.find(a => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    return alert;
  }

  async acknowledgeAlert(alertId: string): Promise<Alert> {
    await delay(200);
    const alert = mockAlerts.find(a => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    alert.acknowledgedAt = new Date().toISOString();
    alert.status = 'firing';
    return alert;
  }

  async resolveAlert(alertId: string): Promise<Alert> {
    await delay(200);
    const alert = mockAlerts.find(a => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    alert.resolvedAt = new Date().toISOString();
    alert.status = 'resolved';
    return alert;
  }

  async listNotificationChannels(): Promise<NotificationChannel[]> {
    await delay();
    return [
      { id: 'nc_01', name: 'Email Alerts', type: 'email', config: { address: 'admin@fidscript.dev' } },
      { id: 'nc_02', name: 'Slack Webhook', type: 'webhook', config: { url: 'https://hooks.slack.com/...' } },
    ];
  }
}

// ─── Logs Module Mock ─────────────────────────────────────────────────────────

class MockLogsModule {
  async getLogs(params?: { projectId?: string; level?: string; limit?: number }): Promise<LogEntry[]> {
    await delay();
    return mockLogEntries.slice(0, params?.limit || 50);
  }

  async ingestLogs(logs: Partial<LogEntry>[]): Promise<void> {
    await delay(100);
  }
}

// ─── Templates Module Mock ───────────────────────────────────────────────────

class MockTemplatesModule {
  async list(): Promise<{ id: string; name: string; description: string; category: string }[]> {
    await delay();
    return [
      { id: 'tpl_01', name: 'React Frontend', description: 'Modern React app with TypeScript', category: 'frontend' },
      { id: 'tpl_02', name: 'Node.js API', description: 'Express REST API starter', category: 'backend' },
      { id: 'tpl_03', name: 'Full Stack', description: 'React + Node.js monorepo', category: 'fullstack' },
    ];
  }
}

// ─── Github Module Mock ──────────────────────────────────────────────────────

class MockGithubModule {
  async listRepositories(): Promise<{ id: number; name: string; fullName: string; defaultBranch: string; private: boolean }[]> {
    await delay();
    return [
      { id: 1, name: 'website', fullName: 'user/website', defaultBranch: 'main', private: false },
      { id: 2, name: 'api-service', fullName: 'user/api-service', defaultBranch: 'main', private: true },
      { id: 3, name: 'mobile-app', fullName: 'user/mobile-app', defaultBranch: 'develop', private: true },
    ];
  }

  async getBranches(owner: string, repo: string): Promise<{ name: string; commit: string }[]> {
    await delay();
    return [
      { name: 'main', commit: 'abc123' },
      { name: 'develop', commit: 'def456' },
      { name: 'feature/new-ui', commit: 'ghi789' },
    ];
  }

  async status(): Promise<{ connected: boolean; username?: string }> {
    await delay();
    return { connected: true, username: 'mock-user' };
  }

  async connect(): Promise<void> {
    await delay();
    // Mock connect — no-op
  }
}

// ─── Mock SDK Factory ────────────────────────────────────────────────────────

export function createMockSdk(): FidscriptSDK {
  return {
    auth: new MockAuthModule(),
    projects: new MockProjectsModule(),
    deployments: new MockDeploymentsModule(),
    storage: new MockStorageModule(),
    databases: new MockDatabasesModule(),
    database: (id: string) => new MockDatabaseProvider(id),
    domains: new MockDomainsModule(),
    email: new MockEmailModule(),
    functions: new MockFunctionsModule(),
    queues: new MockQueuesModule(),
    cron: new MockCronModule(),
    realtime: new MockRealtimeModule(),
    monitoring: new MockMonitoringModule(),
    logs: new MockLogsModule(),
    templates: new MockTemplatesModule(),
    github: new MockGithubModule(),
  } as unknown as FidscriptSDK;
}
