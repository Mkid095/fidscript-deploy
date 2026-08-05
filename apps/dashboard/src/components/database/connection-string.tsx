'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import type { DbConnectionInfo } from './connection-panel-types';

interface ConnectionStringProps {
  connInfo: DbConnectionInfo | null;
  loading: boolean;
  onLoad: () => void;
}

export function ConnectionString({ connInfo, loading, onLoad }: ConnectionStringProps) {
  return (
    <div className="rounded border border-[var(--rail)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)]">
        <p className="text-xs font-semibold text-[var(--text)]">Connection Details</p>
        <button
          onClick={onLoad}
          disabled={loading}
          className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load'}
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
  );
}
