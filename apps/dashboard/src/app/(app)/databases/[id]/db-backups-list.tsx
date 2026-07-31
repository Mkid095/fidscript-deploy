'use client';

import { Button, Card } from '@fidscript/ui';

interface DatabaseBackup {
  id: string;
  databaseId: string;
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
  onRestore: (id: string) => void;
}

export function DbBackupsList({ backups, restoringBackupId, onRestore }: Props) {
  return (
    <div>
      {backups.length === 0 ? (
        <Card className="border border-[var(--rail)]" padding="lg">
          <p className="text-sm text-[var(--text-muted)] text-center">No backups available yet.</p>
        </Card>
      ) : (
        <Card className="border border-[var(--rail)]" padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">ID</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden md:table-cell">Size</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="text-right text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(backup => (
                <tr key={backup.id} className="border-b border-[var(--rail)] last:border-0">
                  <td className="px-4 py-3 text-[var(--text)] font-mono text-xs">{backup.id}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell">
                    {formatBytes(backup.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] hidden lg:table-cell">
                    {new Date(backup.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={restoringBackupId === backup.id}
                      onClick={() => onRestore(backup.id)}
                    >
                      Restore
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
