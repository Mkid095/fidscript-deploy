'use client';

import { Button, Card } from '@fidscript/ui';

interface ConnectionInfo {
  host: string;
  port: number;
  database: string;
  connectionString: string;
}

interface Props {
  connectionInfo: ConnectionInfo | null;
  poolConnectionInfo: ConnectionInfo | null;
  sslEnabled: boolean;
  onSslToggle: (enabled: boolean) => void;
  onLoadDirect: () => void;
  onLoadPool: () => void;
  onCopyDirect: () => void;
  onCopyPool: () => void;
}

export function DbConnectionCard({
  connectionInfo, poolConnectionInfo, sslEnabled,
  onSslToggle, onLoadDirect, onLoadPool, onCopyDirect, onCopyPool,
}: Props) {
  return (
    <Card className="border border-[var(--rail)]" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">SSL Connection</h2>
        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={sslEnabled}
            onChange={e => onSslToggle(e.target.checked)}
            className="w-4 h-4 accent-[var(--accent)]"
          />
          SSL
        </label>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Direct connection</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--rail)] rounded px-3 py-2 font-mono truncate">
              {connectionInfo ? connectionInfo.connectionString : 'Click Load to fetch'}
            </code>
            <Button variant="ghost" size="sm" onClick={onCopyDirect}>Copy</Button>
            <Button variant="secondary" size="sm" onClick={onLoadDirect}>Load</Button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Pooled (PgBouncer)</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--rail)] rounded px-3 py-2 font-mono truncate">
              {poolConnectionInfo ? poolConnectionInfo.connectionString : 'Click Load to fetch'}
            </code>
            <Button variant="ghost" size="sm" onClick={onCopyPool}>Copy</Button>
            <Button variant="secondary" size="sm" onClick={onLoadPool}>Load</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
