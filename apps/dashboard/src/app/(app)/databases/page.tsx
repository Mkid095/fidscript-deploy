'use client';


import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import { Toast } from '@fidscript/ui';

import { makeSdk } from '@/lib/sdk';
interface Database {
  id: string;
  name: string;
  type: 'postgres' | 'redis';
  status: string;
  connectionString?: string;
  ownerId: string;
  createdAt: string;
}

function getSdk() {
  const token = localStorage.getItem('fidscript_token');
  if (!token) throw new Error('Not authenticated');
  return makeSdk(token);
}

export default function DatabasesPage() {
  const router = useRouter();

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
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.databases.list();
        setDatabases(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load databases');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const projects = await sdk.projects.list();
      const projectId = projects[0]?.id;
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
  }, [newName, newType]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Databases</h1>
          <p className="text-sm text-slate-500">
            {databases.length} database{databases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(s => !s)}
        >
          {showCreate ? 'Cancel' : 'Create Database'}
        </Button>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {showCreate && (
        <Card className="border border-[#1e2130] mb-6" padding="lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">New Database</h2>
          <form onSubmit={handleCreate} noValidate>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Database name</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="my-database"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as 'postgres' | 'redis')}
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="postgres">PostgreSQL</option>
                  <option value="redis">Redis</option>
                </select>
              </div>
              <Button type="submit" variant="primary" size="sm" loading={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
            {createError && (
              <p className="text-red-400 text-xs mt-3">{createError}</p>
            )}
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      ) : databases.length === 0 ? (
        <EmptyState
          title="No databases yet"
          description="Create your first managed database to get started."
          action={
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              Create Database
            </Button>
          }
        />
      ) : (
        <Card className="border border-[#1e2130]" padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {databases.map(db => (
                <tr
                  key={db.id}
                  className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30"
                >
                  <td className="px-4 py-3">
                    <button
                      className="text-left w-full text-slate-200 font-medium"
                      onClick={() => router.push(`/databases/${db.id}`)}
                    >
                      {db.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-slate-400">{db.type}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      db.status === 'ready'
                        ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
                        : 'bg-[#1e2130] border-[#1e2130] text-slate-400'
                    }`}>
                      {db.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                    {new Date(db.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/databases/${db.id}`)}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
