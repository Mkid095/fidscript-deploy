'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import { Toast } from '@fidscript/ui';
import type { Project } from '@/types';

interface Bucket {
  id: string;
  name: string;
  provider: string;
  status: string;
  createdAt: string;
}

function getSdk() {
  const token = localStorage.getItem('fidscript_token');
  if (!token) throw new Error('Not authenticated');
  return createFidscript({ apiKey: token });
}

export default function StoragePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project') ?? '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data);
        if (!selectedProject && data.length > 0) {
          setSelectedProject(data[0].id);
        }
      } catch {
        // auth guard handles redirect
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;

    async function loadBuckets() {
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.storage.listBuckets(selectedProject);
        setBuckets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load buckets');
      } finally {
        setLoading(false);
      }
    }
    loadBuckets();

    const url = new URL(window.location.href);
    url.searchParams.set('project', selectedProject);
    router.replace(url.pathname + url.search);
  }, [selectedProject, router]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedProject) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.storage.createBucket(selectedProject, newName.trim());
      setBuckets(prev => [...prev, created]);
      setNewName('');
      setShowCreate(false);
      setToast({ message: `Bucket "${created.name}" created`, type: 'success' });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create bucket');
    } finally {
      setCreating(false);
    }
  }, [newName, selectedProject]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Storage</h1>
          <p className="text-sm text-slate-500">
            {buckets.length} bucket{buckets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(s => !s)}
            disabled={!selectedProject}
          >
            {showCreate ? 'Cancel' : 'Create Bucket'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {showCreate && (
        <Card className="border border-[#1e2130] mb-6" padding="lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">New Bucket</h2>
          <form onSubmit={handleCreate} noValidate>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bucket name</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="my-bucket"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                />
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
      ) : !selectedProject ? (
        <EmptyState
          title="Select a project"
          description="Choose a project above to view its storage buckets."
        />
      ) : buckets.length === 0 ? (
        <EmptyState
          title="No buckets yet"
          description="Create your first storage bucket to store files and assets."
          action={
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              Create Bucket
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {buckets.map(bucket => (
            <div
              key={bucket.id}
              className="cursor-pointer"
              onClick={() => router.push(`/storage/${bucket.id}?project=${selectedProject}`)}
            >
              <Card className="border border-[#1e2130] hover:border-blue-500 transition-colors" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">{bucket.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Provider: {bucket.provider} &middot; Created {new Date(bucket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    bucket.status === 'active'
                      ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
                      : 'bg-[#1e2130] border-[#1e2130] text-slate-400'
                  }`}>
                    {bucket.status}
                  </span>
                </div>
              </Card>
            </div>
          ))}
        </div>
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
