export interface FIDScriptConfig {
  apiKey: string;
  baseUrl?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  version: string;
  status: string;
  commitSha?: string;
  deploymentUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface StorageFile {
  id: string;
  key: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes: number;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
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

export interface CronJob {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface Metric {
  id: string;
  metric: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: string;
}

export interface Alert {
  id: string;
  severity: string;
  status: string;
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}