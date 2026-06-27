'use client';

import { useDatabase } from '../database-context';
import { formatBytes } from '@/lib/format';

export default function DatabaseOverview() {
  const { database, schema, loadingSchema, realtimeTables } = useDatabase();
  if (!database) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-[var(--text-dim)]">
        {loadingSchema ? 'Loading…' : 'No database loaded'}
      </div>
    );
  }
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">{database.name}</h1>
        <p className="text-xs text-[var(--text-dim)] mt-1">
          {database.type} {database.version} · {database.environment} · {database.status}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Size" value={formatBytes(database.sizeBytes)} />
        <Stat label="Max conns" value={String(database.maxConnections)} />
        <Stat label="Tables" value={String(schema.length)} />
        <Stat label="Realtime" value={String(realtimeTables.length)} />
      </div>

      <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-4">
        <p className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Connection</p>
        <code className="text-xs text-[var(--text-muted)] font-mono break-all bg-[var(--surface-2)] border border-[var(--rail)] rounded p-2 block">
          {`postgresql://${database.type === 'postgresql' ? '...' : 'n/a'}`}
        </code>
        <p className="text-[10px] text-[var(--text-dim)] mt-2">
          Full credentials available in the Settings tab.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">{label}</p>
      <p className="text-lg font-semibold text-[var(--text)] mt-1 font-mono">{value}</p>
    </div>
  );
}
