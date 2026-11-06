// Database backup types

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

// The schedule types are gone with the schedule: the platform does not run
// scheduled backups, so there is nothing for them to describe. `BackupRecord`
// stays — that is the backup the operator took.
