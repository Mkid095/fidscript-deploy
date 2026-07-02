'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { formatDuration, formatBytes } from '@/lib/format';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle03Icon, AlertCircleIcon, RefreshIcon } from '@hugeicons/core-free-icons';

export function ConnectionPanel() {
  const { getSdk } = useAuth();
  const { databaseId, dbStatus, refreshStatus } = useDatabase();
  const [connInfo, setConnInfo] = useState<Record<string, string> | null>(null);
  const [loadingConn, setLoadingConn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const loadConnection = async () => {
    if (!databaseId) return;
    setLoadingConn(true);
    try {
      const conn = await getSdk().database(databaseId).connection() as Record<string, string>;
      setConnInfo(conn);
    } catch { /* ignore */ } finally { setLoadingConn(false); }
  };

  const handleRotatePassword = async () => {
    if (!databaseId) return;
    setRotating(true);
    try {
      const result = await getSdk().database(databaseId).rotatePassword() as { password: string };
      setNewPassword(result.password);
      setTimeout(() => setNewPassword(null), 30_000);
    } catch { /* ignore */ } finally { setRotating(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-sm font-semibold text-[var(--text)]">Connection</h2>

      {/* Connection status */}
      <div className="rounded border border-[var(--rail)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
          <p className="text-xs font-semibold text-[var(--text)]">Database Status</p>
          <button onClick={refreshStatus} className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]">
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

      {/* Connection string */}
      <div className="rounded border border-[var(--rail)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
          <p className="text-xs font-semibold text-[var(--text)]">Connection Details</p>
          <button
            onClick={loadConnection}
            disabled={loadingConn}
            className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50"
          >
            {loadingConn ? 'Loading…' : 'Load'}
          </button>
        </div>
        {connInfo ? (
          <div className="p-4 space-y-3">
            {[
              ['Host',      connInfo.host ?? ''],
              ['Port',      connInfo.port ?? ''],
              ['Database',  connInfo.database ?? ''],
              ['User',      connInfo.user ?? ''],
              ['SSL',       connInfo.ssl ? 'Required (SSL enabled)' : 'No SSL'],
              ['Pool Size', connInfo.poolSize ?? ''],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-dim)] w-24 flex-shrink-0">{label}</span>
                <code className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-1 rounded flex-1 truncate">{value}</code>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-dim)] w-24 flex-shrink-0">Password</span>
              <code className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-1 rounded flex-1">
                {newPassword ? newPassword : showPassword ? (connInfo.password ?? '••••••') : '••••••••••'}
              </code>
              <button onClick={() => setShowPassword(s => !s)} className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-dim)] w-24 flex-shrink-0">Connection String</span>
              <code className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-1 rounded flex-1 truncate" title={connInfo.connectionString ?? ''}>
                {connInfo.connectionString ?? ''}
              </code>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => navigator.clipboard.writeText(connInfo.connectionString ?? '')}
                className="text-[10px] px-2 py-1 rounded border border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                Copy connection string
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[var(--text-dim)]">
            <p>Click Load to fetch connection details.</p>
            <p className="text-[10px] mt-1 opacity-60">Credentials are sensitive — handle accordingly.</p>
          </div>
        )}
      </div>

      {/* Rotation */}
      <div className="rounded border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
          <p className="text-xs font-semibold text-[var(--text)]">Password Rotation</p>
        </div>
        <div className="p-4">
          {newPassword ? (
            <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-3">
              <p className="text-xs font-semibold text-emerald-400 mb-1">New password generated!</p>
              <code className="text-xs font-mono text-emerald-300 break-all">{newPassword}</code>
              <p className="text-[10px] text-emerald-400/70 mt-2">Copy this now — it will not be shown again.</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-[var(--text-dim)] mb-3">Rotate the database password. This will invalidate the current password immediately.</p>
              <button
                onClick={handleRotatePassword}
                disabled={rotating}
                className="text-xs px-3 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
              >
                {rotating ? 'Rotating…' : 'Rotate password'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SSL */}
      <div className="rounded border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
          <p className="text-xs font-semibold text-[var(--text)]">SSL Configuration</p>
        </div>
        <div className="p-4 space-y-2">
          {[
            { label: 'SSL Mode',      value: 'require' },
            { label: 'Certificate',   value: 'PostgreSQL ECDSA certificate' },
            { label: 'Verify',        value: 'Server certificate is verified' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-dim)] w-32">{label}</span>
              <code className="text-xs font-mono text-[var(--text-muted)]">{value}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] mb-0.5">{label}</p>
      <div className="text-xs text-[var(--text-muted)] font-mono">{value}</div>
    </div>
  );
}
