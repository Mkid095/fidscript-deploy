'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { Project, Queue } from '@/types';

export default function QueuesPage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const shellProjectId = useShellProjectId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingQueues, setLoadingQueues] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('redis');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0) setPickedProjectId((data.projects ?? [])[0].id);
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, [getSdk, shellProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadQueues() {
      setLoadingQueues(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.queues.list(selectedProjectId);
        setQueues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load queues');
      } finally {
        setLoadingQueues(false);
      }
    }
    loadQueues();
  }, [selectedProjectId, getSdk]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !selectedProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      await sdk.queues.create(selectedProjectId, { name: newName.trim(), type: newType });
      const data = await sdk.queues.list(selectedProjectId);
      setQueues(data);
      setNewName('');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create queue');
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
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Queues</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {queues.length} queue{queues.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Queue
        </Button>
      </div>

      <div className="mb-6">
        {!shellProjectId && (
          <>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Project</label>
            <select
              value={pickedProjectId}
              onChange={e => setPickedProjectId(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm min-w-52"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {error && (
        <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>
      )}

      {loadingQueues ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : queues.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No queues"
            description="Create a queue to start managing message streams."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                Create Queue
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
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Type</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Created</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queues.map(queue => (
                <tr
                  key={queue.id}
                  className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30 cursor-pointer"
                  onClick={() => router.push(`/queues/${queue.id}?project=${selectedProjectId}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-[var(--text)]">{queue.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--rail)] text-[var(--text-muted)] border border-[var(--rail)]">
                      {queue.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      queue.status === 'active'
                        ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : 'bg-[var(--rail)] text-[var(--text-muted)]'
                    }`}>
                      {queue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {new Date(queue.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/queues/${queue.id}?project=${selectedProjectId}`)}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] bg-none border-none cursor-pointer p-0"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Queue" size="sm">
        <form onSubmit={handleCreate} noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Queue name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="my-queue"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="redis">Redis</option>
                <option value="nats">NATS</option>
                <option value="memory">Memory</option>
              </select>
            </div>
            {createError && (
              <p className="text-[var(--danger)] text-xs">{createError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
