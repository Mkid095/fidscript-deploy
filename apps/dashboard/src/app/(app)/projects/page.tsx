'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ProjectsPage() {
  const { user, getSdk } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Build slug from name live.
  useEffect(() => {
    setSlug(slugify(name));
  }, [name]);

  // Load projects.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        if (!cancelled) setProjects(data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getSdk]);

  function openCreate() {
    setName('');
    setDescription('');
    setSlug('');
    setCreateError(null);
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.projects.create({
        name: name.trim(),
        type: 'frontend', // default; change in project settings
        description: description.trim() || undefined,
      });
      setProjects(prev => [...prev, created]);
      closeCreate();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const canCreate = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'developer';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Projects</h1>
          <p className="text-sm text-slate-500">
            {projects.length === 0 ? 'No projects yet' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={openCreate}>
            Create Project
          </Button>
        )}
      </div>

      {loadError && (
        <p className="text-red-400 mb-4 text-sm">{loadError}</p>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal
          isOpen={true}
          title="Create Project"
          onClose={closeCreate}
        >
          <form id="create-form" onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Project name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-project"
              autoFocus
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />
            {name && (
              <p className="text-xs text-slate-500 -mt-2">
                Slug: <span className="font-mono text-slate-300">{slug}</span>
              </p>
            )}

            <Input
              label="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this project do?"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
            />

            {createError && (
              <p className="text-sm text-red-400">{createError}</p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={closeCreate}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={creating}
                disabled={!name.trim()}
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Empty state */}
      {projects.length === 0 && !loadError ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start deploying apps, databases, and more."
          action={
            canCreate ? (
              <Button variant="primary" size="sm" onClick={openCreate}>
                Create Project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} href={`/projects/${project.id}?section=deployments`} className="no-underline group block">
              <div className="rounded-lg border border-[#1e2130] bg-[#0f1117] hover:border-blue-500 transition-colors duration-150 p-5 h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-200 truncate group-hover:text-blue-300 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{project.slug}</p>
                  </div>
                  <span className="ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#1e2130] text-slate-400 border border-[#2a2d3a] capitalize">
                    {project.status}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-[#1e2130] text-slate-500 border border-[#2a2d3a] capitalize">
                    {project.type}
                  </span>
                  <span className="text-xs text-slate-600">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
