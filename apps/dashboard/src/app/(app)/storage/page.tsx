'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Input, Spinner, EmptyState, Toast } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { Project } from '@/types';

interface Bucket {
  id: string;
  name: string;
  provider: string;
  status: string;
  createdAt: string;
}

const PROVIDERS = [
  { value: 'minio', label: 'MinIO', available: true },
  { value: 'cloudinary', label: 'Cloudinary', available: false },
  { value: 'telegram', label: 'Telegram', available: false },
];

export default function StoragePage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shellProjectId = useShellProjectId();
  const projectId = searchParams.get('project') ?? '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(shellProjectId ?? projectId);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (shellProjectId) return; // shell chose; nothing to load
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if (!selectedProject && (data.projects ?? []).length > 0) {
          setSelectedProject((data.projects ?? [])[0].id);
        }
      } catch {
        // auth guard handles redirect
      }
    }
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSdk, shellProjectId]);

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
  }, [selectedProject, router, getSdk]);

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
  }, [newName, selectedProject, getSdk]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Storage</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {buckets.length} bucket{buckets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!shellProjectId && projects.length > 0 && (
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
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
        <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>
      )}

      {showCreate && (
        <Card className="border border-[var(--rail)] mb-6" padding="lg">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">New Bucket</h2>
          <form onSubmit={handleCreate} noValidate>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Bucket name</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="my-bucket"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
                />
              </div>
              <Button type="submit" variant="primary" size="sm" loading={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
            {createError && (
              <p className="text-[var(--danger)] text-xs mt-3">{createError}</p>
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
              <Card className="border border-[var(--rail)] hover:border-[var(--accent)] transition-colors" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text)]">{bucket.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {(() => {
                        const p = PROVIDERS.find(x => x.value === bucket.provider);
                        return (
                          <span style={!p?.available ? { opacity: 0.5 } : undefined}>
                            {p?.label ?? bucket.provider}{!p?.available ? ' (not yet available)' : ''}
                          </span>
                        );
                      })()}
                      &middot; Created {new Date(bucket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    bucket.status === 'active'
                      ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
                      : 'bg-[var(--rail)] border-[var(--rail)] text-[var(--text-muted)]'
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
