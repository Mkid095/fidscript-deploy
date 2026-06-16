// User types
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'static';
  status: 'pending' | 'building' | 'deployed' | 'failed' | 'deleted';
  repository?: string;
  branch?: string;
  rootDomain?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Deployment types
export interface Deployment {
  id: string;
  projectId: string;
  status: 'pending' | 'building' | 'deployed' | 'failed' | 'rolled_back';
  commitHash?: string;
  commitMessage?: string;
  branch?: string;
  buildLogs?: string;
  deployedAt?: Date;
  createdAt: Date;
}

// Database types
export interface Database {
  id: string;
  name: string;
  type: 'postgres' | 'redis';
  status: 'pending' | 'creating' | 'running' | 'stopped' | 'failed';
  connectionString?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Domain types
export interface Domain {
  id: string;
  name: string;
  projectId?: string;
  sslStatus: 'pending' | 'issuing' | 'active' | 'failed' | 'revoked';
  dnsStatus: 'pending' | 'verified' | 'failed';
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Function types
export interface Function {
  id: string;
  name: string;
  runtime: 'node' | 'python' | 'rust' | 'go';
  status: 'pending' | 'deploying' | 'active' | 'failed';
  projectId?: string;
  code?: string;
  entryPoint?: string;
  memory?: number;
  timeout?: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Queue types
export interface Queue {
  id: string;
  name: string;
  type: 'nats' | 'bull';
  status: 'pending' | 'creating' | 'running' | 'stopped';
  ownerId: string;
  createdAt: Date;
}

// Cron job types
export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command?: string;
  functionId?: string;
  status: 'pending' | 'active' | 'paused' | 'failed';
  lastRunAt?: Date;
  nextRunAt?: Date;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Storage bucket types
export interface StorageBucket {
  id: string;
  name: string;
  provider: 'minio' | 'cloudinary' | 'telegram';
  status: 'pending' | 'creating' | 'running' | 'failed';
  publicUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Key types
export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  permissions: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  ownerId: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
