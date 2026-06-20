'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';
import { Input } from '@fidscript/ui';

import type { Project } from '@/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('static');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoading(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.projects.list();
        setProjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      const created = await sdk.projects.create({ name: newName.trim(), type: newType });
      setProjects(prev => [...prev, created]);
      setNewName('');
      setNewType('static');
      setShowCreate(false);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Projects</h1>
          <p className="text-sm text-slate-500">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(s => !s)}
        >
          {showCreate ? 'Cancel' : 'Create Project'}
        </Button>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {showCreate && (
        <Card className="border border-[#1e2130] mb-6" padding="lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">New Project</h2>
          <form onSubmit={handleCreate} noValidate>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Project name</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="my-project"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="static">Static</option>
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="docker">Docker</option>
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

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to get started deploying."
          action={
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              Create Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`} className="no-underline">
              <div
                className="rounded-lg border border-[#1e2130] bg-[#0f1117] p-5 cursor-pointer transition-colors duration-150 hover:border-blue-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-0.5">{project.name}</h3>
                    <p className="text-xs text-slate-500">{project.slug}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1e2130] text-slate-400 border border-[#1e2130] capitalize">
                    {project.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-3">{project.type}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
