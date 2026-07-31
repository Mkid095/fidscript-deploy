'use client';

import { Button, Card } from '@fidscript/ui';
import type { Database } from '@fidscript-deploy/sdk';

interface Props {
  db: Database;
  showPassword: boolean;
  rotating: boolean;
  onTogglePassword: () => void;
  onCopy: () => void;
  onRotate: () => void;
}

function maskConnectionString(connStr: string): string {
  return connStr.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

export function DbOverviewCard({ db, showPassword, rotating, onTogglePassword, onCopy, onRotate }: Props) {
  const masked = db.connectionString ? maskConnectionString(db.connectionString) : '********';

  return (
    <>
      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Environment Variable</h2>
        <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800/30 rounded-lg px-4 py-3 text-sm">
          <span className="text-[var(--accent)] mt-0.5 shrink-0">ℹ</span>
          <p className="text-[var(--text-muted)]">
            Use <code className="text-[var(--accent)] font-mono bg-[var(--surface-2)] px-1.5 py-0.5 rounded">DATABASE_URL</code>{' '}
            in your deployment env vars — the platform injects this automatically.
          </p>
        </div>
      </Card>

      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Connection</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Connection string</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--rail)] rounded px-3 py-2 font-mono truncate">
                {showPassword && db.connectionString ? db.connectionString : masked}
              </code>
              <Button variant="ghost" size="sm" onClick={onTogglePassword}>
                {showPassword ? 'Hide' : 'Show'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onCopy}>Copy</Button>
            </div>
          </div>
          <Button variant="secondary" size="sm" loading={rotating} onClick={onRotate}>
            Rotate Credentials
          </Button>
        </div>
      </Card>
    </>
  );
}
