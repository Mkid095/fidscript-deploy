'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle03Icon, AlertCircleIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { formatDuration, formatBytes } from '@/lib/format';

interface DbStatus {
  healthy: boolean;
  version?: string;
  region?: string;
  uptimeSeconds?: number;
  currentConnections?: number;
  maxConnections?: number;
  totalSizeMb?: number;
}

interface ConnectionStatusProps {
  dbStatus: DbStatus | null;
  onRefresh: () => void;
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] mb-0.5">{label}</p>
      <div className="text-xs text-[var(--text-muted)] font-mono">{value}</div>
    </div>
  );
}

export function ConnectionStatus({ dbStatus, onRefresh }: ConnectionStatusProps) {
  return (
    <div className="rounded border border-[var(--rail)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
        <p className="text-xs font-semibold text-[var(--text)]">Database Status</p>
        <button onClick={onRefresh} className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]">
          <HugeiconsIcon icon={RefreshIcon} size={11} className="inline" />Refresh
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <StatusRow label="Health" value={
          <span className={dbStatus?.healthy ? 'text-emerald-400' : 'text-rose-400'}>
            <HugeiconsIcon icon={dbStatus?.healthy ? CheckmarkCircle03Icon : AlertCircleIcon} size={14} className="inline mr-1" />
            {dbStatus?.healthy ? 'Healthy' : 'Unhealthy'}
          </span>
        } />
        <StatusRow label="Version" value={<span className="font-mono">{dbStatus?.version ?? '—'}</span>} />
        <StatusRow label="Region" value={<span className="font-mono">{dbStatus?.region ?? '—'}</span>} />
        <StatusRow label="Uptime" value={<span>{dbStatus?.uptimeSeconds ? formatDuration(dbStatus.uptimeSeconds * 1000) : '—'}</span>} />
        <StatusRow label="Connections" value={
          <span>{dbStatus?.currentConnections ?? 0} / {dbStatus?.maxConnections ?? '?'}</span>
        } />
        <StatusRow label="Database size" value={
          <span>{dbStatus?.totalSizeMb ? formatBytes(dbStatus.totalSizeMb * 1024 * 1024) : '—'}</span>
        } />
      </div>
    </div>
  );
}
