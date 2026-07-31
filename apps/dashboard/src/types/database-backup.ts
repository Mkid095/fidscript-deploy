// Database backup and schedule types

export interface BackupRecord {
  id: string;
  status: 'completed' | 'in_progress' | 'failed';
  sizeBytes: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  url?: string;
  storageBucket?: string;
  versionLabel?: string;
  type: 'manual' | 'scheduled';
  scheduleId?: string;
}

export type BackupScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface BackupSchedule {
  id: string;
  enabled: boolean;
  frequency: BackupScheduleFrequency;
  timeUtc: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  retentionCount: number;
  storageBucket: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface BackupSettings {
  schedule: BackupSchedule | null;
  defaultBucket: string;
  maxManualBackups: number;
  autoBackupRetentionDays: number;
}
