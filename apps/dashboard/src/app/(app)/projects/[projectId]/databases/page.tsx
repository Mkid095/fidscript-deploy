'use client';
/* eslint-disable import/order */


import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, Button, Input, Spinner, EmptyState, Toast } from '@fidscript/ui';
import type { Database } from '@fidscript/sdk';

export default function ProjectDatabasesPage() {
  const { getSdk } = useAuth();
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await getSdk().databases.list(projectId);
      setDatabases(list);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally { setLoading(false); }
  }, [projectId, getSdk]);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !projectId) return;
    setCreating(true);
    try {
      const db = await getSdk().databases.create(projectId, { name: newName.trim() });
      setToast({ type: 'success', message: `Database "${db.name}" provisioned` });
      setNewName('');
      await load();
      router.push(`/projects/${projectId}/databases/${db.id}`);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally { setCreating(false); }
  };

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Databases</h1>
          <p className="text-xs text-[var(--text-dim)] mt-1">Provisioned Postgres databases for this project</p>
        </div>
        <form onSubmit={create} className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e: any) => setNewName(e.target.value)}
            placeholder="db-name"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] text-xs w-48"
          />
          <Button type="submit" variant="primary" size="sm" loading={creating} disabled={!newName.trim()}>
            + Create
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : databases.length === 0 ? (
        <EmptyState
          title="No databases yet"
          description="Create your first database to get started with the SDK."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {databases.map(db => (
            <Link
              key={db.id}
              href={`/projects/${projectId}/databases/${db.id}`}
              className="block rounded-lg border border-[var(--rail)] bg-[var(--surface)] p-4 hover:border-[var(--accent)]/30 hover:bg-[var(--rail)]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text)]">{db.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  db.status === 'ready' ? 'bg-[var(--success)]/10 text-[var(--success)]'
                    : db.status === 'failed' ? 'bg-[var(--accent)]/10 text-[var(--danger)]'
                    : 'bg-[var(--warning)]/10 text-[var(--warning)]'
                }`}>
                  {db.status}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-dim)] font-mono mt-1">
                {db.type} {db.version} · {db.environment}
              </p>
              <p className="text-[10px] text-[var(--text-dim)] mt-1 font-mono">{db.id.slice(0, 8)}…</p>
            </Link>
          ))}
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
