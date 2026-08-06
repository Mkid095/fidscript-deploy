/**
 * Supported cron job action types. Each maps to a distinct executor in
 * apps/api: CronJobActionExecutorService (email, queue) or inline on
 * CronJobExecutionService (function, http).
 */
export type CronJobActionType = 'http' | 'function' | 'email' | 'queue';

export const CronActionType = {
  Http: 'http' as const,
  Function: 'function' as const,
  /** Send an email via the project's email service. Requires `emailConfig`. */
  Email: 'email' as const,
  /** Publish a message to a project queue. Requires `queueConfig`. */
  Queue: 'queue' as const,
} as const;

export interface CronJobEmailConfig {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface CronJobQueueConfig {
  queueId: string;
  body?: unknown;
  headers?: Record<string, string>;
  delaySeconds?: number;
}

export interface CronJob {
  id: string;
  projectId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  targetType?: string;
  actionType?: CronJobActionType;
  endpoint?: string;
  functionId?: string;
  emailConfig?: CronJobEmailConfig;
  queueConfig?: CronJobQueueConfig;
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
