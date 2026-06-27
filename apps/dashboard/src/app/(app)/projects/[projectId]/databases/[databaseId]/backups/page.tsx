'use client';
/* eslint-disable import/order */


import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '../../database-context';
import { formatBytes, formatRelativeTime } from '@/lib/format';

export default function BackupsPage() {
  const { getSdk } = useAuth();
  const databaseId = useDatabase()?.databaseId;
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [taking, setTaking] = useState(false);

  const load = useCallback(async () => {
    if (!databaseId) return;
    setLoading(true);
    try {
      const list = await getSdk().databases.listBackups(databaseId);
      setBackups(list);
    } finally { setLoading(false); }
  }, [databaseId, getSdk]);

  useEffect(() => { load(); }, [load]);

  const takeBackup = async () => {
    if (!databaseId) return;
    setTaking(true);
    try {
      await getSdk().databases.backup(databaseId);
      await load();
    } finally { setTaking(false); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Backups</h1>
          <p className="text-xs text-[var(--text-dim)] mt-1">pg_dump → Minio. Restore overwrites current data.</p>
        </div>
        <button
          onClick={takeBackup}
          disabled={taking}
          className="text-xs px-3 py-1.5 rounded bg-[var(--success)] hover:bg-[var(--success)] text-[var(--text)] font-medium disabled:opacity-50"
        >
          {taking ? 'Creating…' : '+ Take backup'}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-dim)]">Loading…</p>
      ) : backups.length === 0 ? (
        <p className="text-xs text-[var(--text-dim)]">No backups yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--rail)] text-left text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
              <th className="px-2 py-2">Filename</th>
              <th className="px-2 py-2">Size</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Created</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id} className="border-b border-[var(--rail)]/40">
                <td className="px-2 py-1.5 font-mono text-[var(--text-muted)]">{b.filename || b.id}</td>
                <td className="px-2 py-1.5 font-mono text-[var(--text-dim)]">{formatBytes(b.sizeBytes ?? b.size_bytes)}</td>
                <td className="px-2 py-1.5 text-[var(--text-dim)]">{b.status}</td>
                <td className="px-2 py-1.5 text-[var(--text-dim)]">{formatRelativeTime(b.createdAt ?? b.created_at)}</td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={async () => {
                      if (!databaseId) return;
                      if (!confirm('Restore from this backup? Current data will be overwritten.')) return;
                      await getSdk().databases.restore(databaseId, b.id);
                      alert('Restore started');
                    }}
                    className="text-[10px] text-[var(--danger)] hover:underline"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
