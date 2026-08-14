'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDatabase } from '../database-context';
import { formatBytes } from '@/lib/format';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle03Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';

export default function DatabaseOverview() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { database, dbStatus, schema, loadingSchema, realtimeTables } = useDatabase();
  if (!database) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-[var(--text-dim)]">
        {loadingSchema ? 'Loading…' : 'No database loaded'}
      </div>
    );
  }
  const statusColor = database.status === 'healthy' ? 'text-emerald-400' : 'text-rose-400';
  const base = `/projects/${projectId}/databases/${database.id}`;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)] font-mono">{database.name}</h1>
        <p className="text-xs text-[var(--text-dim)] mt-1 flex items-center gap-2">
          <span>{database.type} {database.version}</span>
          <span>·</span>
          <span className={statusColor}>
            <HugeiconsIcon icon={database.status === 'healthy' ? CheckmarkCircle03Icon : AlertCircleIcon} size={12} className="inline mr-1" />
            {database.status}
          </span>
          <span>·</span>
          <span>{dbStatus?.region ?? database.environment}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Disk size" value={formatBytes(database.sizeBytes)} />
        <Stat label="Max conns" value={String(database.maxConnections)} />
        <Stat label="Objects" value={String(schema.length)} />
        <Stat label="Realtime" value={String(realtimeTables.length)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-2">Current connections</p>
          <p className="text-2xl font-mono font-bold text-[var(--text)]">{dbStatus?.currentConnections ?? 0}</p>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">of {database.maxConnections} max</p>
        </div>
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-2">Uptime</p>
          <p className="text-sm font-mono text-[var(--text)]">
            {dbStatus?.uptimeSeconds ? `${Math.floor(dbStatus.uptimeSeconds / 3600)}h ${Math.floor((dbStatus.uptimeSeconds % 3600) / 60)}m` : '—'}
          </p>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">See Settings to rotate credentials</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-4">
        <p className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">Quick links</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Explorer',   href: `${base}/explorer` },
            { label: 'SQL Editor', href: `${base}/sql` },
            { label: 'Backups',   href: `${base}/backups` },
            { label: 'Settings',  href: `${base}/settings` },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs px-2.5 py-1.5 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/40"
            >
              {link.label}
            </Link>
          ))}
        </div>
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
