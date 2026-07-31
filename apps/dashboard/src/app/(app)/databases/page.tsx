'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Spinner, EmptyState, Toast } from '@fidscript/ui';
import type { Database } from '@fidscript-deploy/sdk';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { DatabaseListHeader } from './database-list-header';
import { DatabaseCreateForm } from './database-create-form';

export default function DatabasesPage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const shellProjectId = useShellProjectId();

  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'postgres' | 'redis'>('postgres');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function load() {
      if (!shellProjectId) return;
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.databases.list(shellProjectId);
        setDatabases(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load databases');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getSdk, shellProjectId]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const { projects: projectList } = await sdk.projects.list();
      const projectId = shellProjectId ?? (projectList ?? [])[0]?.id;
      if (!projectId) {
        setCreateError('No project found. Create a project first.');
        setCreating(false);
        return;
      }
      const created = await sdk.databases.create(projectId, { name: newName.trim(), type: newType });
      setDatabases(prev => [...prev, created]);
      setNewName('');
      setNewType('postgres');
      setShowCreate(false);
      setToast({ message: `Database "${created.name}" created`, type: 'success' });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create database');
    } finally {
      setCreating(false);
    }
  }, [newName, newType, getSdk, shellProjectId]);

  return (
    <div>
      <DatabaseListHeader count={databases.length} showCreate={showCreate} onToggleCreate={() => setShowCreate(s => !s)} />

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}

      {showCreate && (
        <DatabaseCreateForm
          name={newName} type={newType} creating={creating} error={createError}
          onNameChange={setNewName} onTypeChange={setNewType} onSubmit={handleCreate}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-64"><Spinner size="lg" /></div>
      ) : databases.length === 0 ? (
        <EmptyState
          title="No databases yet"
          description="Create your first managed database to get started."
          action={<Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>Create Database</Button>}
        />
      ) : (
        <Card className="border border-[var(--rail)]" padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden lg:table-cell">Status</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="text-right text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {databases.map(db => (
                <tr key={db.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
                  <td className="px-4 py-3">
                    <button className="text-left w-full text-[var(--text)] font-medium" onClick={() => router.push(`/databases/${db.id}`)}>{db.name}</button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className="text-[var(--text-muted)]">{db.type}</span></td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${db.status === 'ready' ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--rail)] border-[var(--rail)] text-[var(--text-muted)]'}`}>{db.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] hidden lg:table-cell">{new Date(db.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/databases/${db.id}`)}>Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
