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
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
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
  status: string;
  version: string;
  commitSha?: string;
  deploymentUrl?: string;
  createdAt: string;
  completedAt?: string;
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
  name: string;
  cronExpression: string;
  timezone: string;
  targetType?: string;
  endpoint?: string;
  functionId?: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface CronJobRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
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
