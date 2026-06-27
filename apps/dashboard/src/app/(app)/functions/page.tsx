'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Button, Input, Modal, Spinner, EmptyState } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { Project } from '@/types';

interface Function_ {
  id: string;
  name: string;
  runtime: string;
  status: string;
  projectId?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[var(--rail)] text-[var(--text-muted)]',
  BUILDING: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE: 'bg-emerald-900 text-[var(--success)]',
  FAILED: 'bg-red-900 text-[var(--danger)]',
  INACTIVE: 'bg-[var(--rail)] text-[var(--text-muted)]',
};

const RUNTIMES = [
  { value: 'node', label: 'Node.js', available: true },
  { value: 'python', label: 'Python', available: true },
  { value: 'go', label: 'Go', available: false },
  { value: 'rust', label: 'Rust', available: false },
];

export default function FunctionsPage() {
  const { getSdk } = useAuth();
  // ponytail: if we're under the project shell, the shell already chose the project.
  // Skip the project-list fetch + the picker UI; use the shell's projectId directly.
  const shellProjectId = useShellProjectId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [functions, setFunctions] = useState<Function_[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRuntime, setNewRuntime] = useState('node');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (shellProjectId) return; // shell chose; nothing to do
    async function load() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0 && !pickedProjectId) {
          setPickedProjectId((data.projects ?? [])[0].id);
        }
      } catch { /* ignore */ } finally {
        setLoadingProjects(false);
      }
    }
    load();
  }, [getSdk, pickedProjectId, shellProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadFunctions() {
      setLoadingFunctions(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.functions.list(selectedProjectId);
        setFunctions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load functions');
      } finally {
        setLoadingFunctions(false);
      }
    }
    loadFunctions();
  }, [selectedProjectId, getSdk]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.functions.create(selectedProjectId, { name: newName.trim(), runtime: newRuntime });
      setFunctions(prev => [...prev, created]);
      setNewName('');
      setNewRuntime('node');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create function');
    } finally {
      setCreating(false);
    }
  }

  if (loadingProjects) {
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
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Functions</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {functions.length} function{functions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={!selectedProjectId}>
          Create Function
        </Button>
      </div>

      {/* Project selector — hidden when the project shell already chose a project */}
      {!shellProjectId && (
        <div className="mb-6">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Project</label>
          <select
            value={pickedProjectId}
            onChange={e => setPickedProjectId(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm min-w-52"
          >
            <option value="">Select a project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}

      {loadingFunctions ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : functions.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No functions"
            description="Create your first serverless function for this project."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={!selectedProjectId}>
                Create Function
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="border border-[var(--rail)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Runtime</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Created</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {functions.map(fn => (
                <tr key={fn.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/functions/${fn.id}?project=${selectedProjectId}`}
                      className="text-[var(--text)] hover:text-[var(--accent)]"
                    >
                      {fn.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[var(--text-muted)]">{fn.runtime}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[fn.status] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                      {fn.status ?? 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {new Date(fn.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/functions/${fn.id}?project=${selectedProjectId}`}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Function Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(null); setNewName(''); setNewRuntime('node'); }}
        title="Create Function"
      >
        <form onSubmit={handleCreate} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Function name</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="my-function"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Runtime</label>
            <select
              value={newRuntime}
              onChange={e => setNewRuntime(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              {RUNTIMES.map(r => (
                <option key={r.value} value={r.value} disabled={!r.available} style={!r.available ? { opacity: 0.4 } : undefined}>
                  {r.label}{!r.available ? ' (not yet available)' : ''}
                </option>
              ))}
            </select>
          </div>
          {createError && <p className="text-[var(--danger)] text-xs mb-4">{createError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
