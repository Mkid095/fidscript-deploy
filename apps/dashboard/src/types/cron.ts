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
