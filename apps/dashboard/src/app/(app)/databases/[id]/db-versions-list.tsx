'use client';

import { Button, Card } from '@fidscript/ui';

interface DatabaseBackup {
  id: string;
  sizeBytes: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface Props {
  backups: DatabaseBackup[];
  restoringBackupId: string | null;
  takingBackup: boolean;
  onRestore: (id: string) => void;
  onTakeBackup: () => void;
}

export function DbVersionsList({ backups, restoringBackupId, takingBackup, onRestore, onTakeBackup }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <Button variant="secondary" size="sm" loading={takingBackup} onClick={onTakeBackup}>
          Take backup now
        </Button>
      </div>
      {backups.length === 0 ? (
        <Card className="border border-[var(--rail)]" padding="lg">
          <p className="text-sm text-[var(--text-muted)] text-center">No versions available yet.</p>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--rail)]" />
          {backups.map((backup, i) => (
            <div key={backup.id} className="relative flex gap-6 pb-6 last:pb-0">
              <div className="relative z-10 flex shrink-0 w-10 h-10 items-center justify-center rounded-full border border-[var(--rail)] bg-[var(--surface-2)]">
                <span className="text-xs text-[var(--text-muted)]">{i + 1}</span>
              </div>
              <Card className="flex-1 border border-[var(--rail)]" padding="md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[var(--text)] font-medium">
                      Backup {formatBytes(backup.sizeBytes)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(backup.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={restoringBackupId === backup.id}
                    onClick={() => onRestore(backup.id)}
                  >
                    Restore
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  ID: <span className="font-mono text-[var(--text-muted)]">{backup.id}</span>
                </p>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
