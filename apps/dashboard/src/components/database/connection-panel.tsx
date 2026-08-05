'use client';

import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { useConnectionPanel } from './connection-panel-hooks';
import { ConnectionStatus } from './connection-status';
import { ConnectionString } from './connection-string';

export function ConnectionPanel() {
  const { databaseId, dbStatus, refreshStatus } = useDatabase();
  const { connInfo, loadingConn, rotating, newPassword, loadConnection, handleRotatePassword } =
    useConnectionPanel(databaseId);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-sm font-semibold text-[var(--text)]">Connection</h2>

      <ConnectionStatus dbStatus={dbStatus} onRefresh={refreshStatus} />
      <ConnectionString connInfo={connInfo} loading={loadingConn} onLoad={loadConnection} />

      {/* Password rotation */}
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
              <p className="text-xs text-[var(--text-dim)] mb-3">
                Rotate the database password. This will invalidate the current password immediately.
              </p>
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
            { label: 'SSL Mode',    value: 'require' },
            { label: 'Certificate', value: 'PostgreSQL ECDSA certificate' },
            { label: 'Verify',      value: 'Server certificate is verified' },
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
