'use client';

import { useCallback, useRef, useState } from 'react';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { formatRelativeTime } from '@/lib/format';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon, CheckmarkCircle03Icon, AlertCircleIcon,
  RefreshIcon, Upload02Icon, TerminalIcon,
  CloudIcon, UserIcon,
} from '@hugeicons/core-free-icons';
import type { MigrationRecord } from '@/types';

export function MigrationsPanel() {
  const { migrations, refreshMigrations, applyMigration } = useDatabase();
  const [runningMigration, setRunningMigration] = useState(false);
  const [migrationSql, setMigrationSql] = useState('');
  const [migrationName, setMigrationName] = useState('');
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingMigrations = migrations.filter(m => m.status === 'pending');
  const appliedMigrations = migrations.filter(m => m.status === 'applied');
  const failedMigrations = migrations.filter(m => m.status === 'failed');

  const handleApply = async () => {
    if (!migrationSql.trim()) return;
    setRunningMigration(true);
    setMigrationError(null);
    setMigrationSuccess(null);
    try {
      await applyMigration(migrationSql.trim(), migrationName.trim() || undefined, 'manual');
      setMigrationSuccess('Migration applied successfully!');
      setMigrationSql('');
      setMigrationName('');
    } catch (err: unknown) {
      setMigrationError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningMigration(false);
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setMigrationSql(content);
      // Auto-generate name from filename
      const name = file.name.replace(/\.sql$/i, '');
      setMigrationName(name);
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  }, []);

  const statusColor: Record<string, string> = {
    applied:  'text-emerald-400',
    pending:  'text-yellow-400',
    failed:   'text-rose-400',
  };
  const statusBg: Record<string, string> = {
    applied:  'bg-emerald-500/10',
    pending:  'bg-yellow-500/10',
    failed:   'bg-rose-500/10',
  };

  const sourceIcon = (source?: string) => {
    if (source === 'cli')  return <HugeiconsIcon icon={TerminalIcon} size={10} className="inline mr-0.5" />;
    if (source === 'api')  return <HugeiconsIcon icon={CloudIcon} size={10} className="inline mr-0.5" />;
    return <HugeiconsIcon icon={UserIcon} size={10} className="inline mr-0.5" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">Migrations</h2>
        <button onClick={refreshMigrations} className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]">
          <HugeiconsIcon icon={RefreshIcon} size={12} />Refresh
        </button>
      </div>

      {/* Run new migration */}
      <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
          <p className="text-xs font-semibold text-[var(--text)]">Run New Migration</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={migrationName}
              onChange={e => setMigrationName(e.target.value)}
              placeholder="Migration name (e.g. 20260629_add_users_table)"
              className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--accent)]/50"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/50 whitespace-nowrap"
            >
              <HugeiconsIcon icon={Upload02Icon} size={13} />
              Upload .sql
            </button>
          </div>
          <textarea
            value={migrationSql}
            onChange={e => setMigrationSql(e.target.value)}
            placeholder="-- SQL migration statement&#10;CREATE TABLE IF NOT EXISTS users (&#10;  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),&#10;  created_at TIMESTAMPTZ NOT NULL DEFAULT now()&#10;);"
            rows={7}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:border-[var(--accent)]/50"
          />
          {migrationError && (
            <div className="flex items-start gap-2 rounded bg-rose-500/10 border border-rose-500/30 px-3 py-2.5 text-[11px] text-rose-400">
              <HugeiconsIcon icon={AlertCircleIcon} size={13} className="flex-shrink-0 mt-0.5" />
              <span className="font-mono">{migrationError}</span>
            </div>
          )}
          {migrationSuccess && (
            <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-[11px] text-emerald-400">
              <HugeiconsIcon icon={CheckmarkCircle03Icon} size={13} />
              {migrationSuccess}
            </div>
          )}
          <button
            onClick={handleApply}
            disabled={runningMigration || !migrationSql.trim()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-50"
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={13} />
            {runningMigration ? 'Applying…' : 'Apply migration'}
          </button>
        </div>
      </div>

      {/* Migration stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">Applied</p>
          <p className="text-xl font-mono font-bold text-emerald-400 mt-1">{appliedMigrations.length}</p>
        </div>
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">Pending</p>
          <p className="text-xl font-mono font-bold text-yellow-400 mt-1">{pendingMigrations.length}</p>
        </div>
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">Failed</p>
          <p className="text-xl font-mono font-bold text-rose-400 mt-1">{failedMigrations.length}</p>
        </div>
      </div>

      {/* Migration history */}
      <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
          <p className="text-xs font-semibold text-[var(--text)]">Migration History</p>
        </div>
        {migrations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-dim)]">No migrations recorded.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--rail)]">
                {['Status', 'Version', 'Name', 'Source', 'Applied by', 'Applied At', 'Error'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[9px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {migrations.map(m => (
                <tr key={m.id} className="border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20">
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBg[m.status] ?? ''} ${statusColor[m.status] ?? ''}`}>
                      {m.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-dim)]">{m.version}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-muted)]">{m.name}</td>
                  <td className="px-4 py-2.5">
                    {m.source && (
                      <span className="text-[10px] text-[var(--text-dim)]">{sourceIcon(m.source)}{m.source}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[10px] text-[var(--text-dim)]">{m.appliedBy ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[var(--text-dim)]">
                    {m.appliedAt ? formatRelativeTime(m.appliedAt) : <span className="opacity-30">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-rose-400 text-[10px] truncate max-w-32" title={m.error ?? ''}>
                    {m.error ? (
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={AlertCircleIcon} size={10} />
                        {m.error}
                      </span>
                    ) : <span className="opacity-30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
