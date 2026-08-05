'use client';

import { useRef } from 'react';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon, CheckmarkCircle03Icon, AlertCircleIcon,
  RefreshIcon, Upload02Icon,
} from '@hugeicons/core-free-icons';
import { useMigrationsForm, useMigrationStats } from './migrations-hooks';
import { MigrationsTable } from './migrations-table';

export function MigrationsPanel() {
  const { migrations, refreshMigrations, applyMigration } = useDatabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    migrationSql, setMigrationSql,
    migrationName, setMigrationName,
    runningMigration,
    migrationError, migrationSuccess,
    handleApply,
    handleFileUpload,
  } = useMigrationsForm({ applyMigration });

  const { applied, pending, failed } = useMigrationStats(migrations);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">Migrations</h2>
        <button
          onClick={refreshMigrations}
          className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]"
        >
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
        <StatCard label="Applied" count={applied.length} color="emerald" />
        <StatCard label="Pending" count={pending.length} color="yellow" />
        <StatCard label="Failed" count={failed.length} color="rose" />
      </div>

      {/* Migration history */}
      <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
          <p className="text-xs font-semibold text-[var(--text)]">Migration History</p>
        </div>
        <MigrationsTable migrations={migrations} />
      </div>
    </div>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: 'emerald' | 'yellow' | 'rose' }) {
  const colorMap = { emerald: 'text-emerald-400', yellow: 'text-yellow-400', rose: 'text-rose-400' };
  return (
    <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold">{label}</p>
      <p className={`text-xl font-mono font-bold ${colorMap[color]} mt-1`}>{count}</p>
    </div>
  );
}
