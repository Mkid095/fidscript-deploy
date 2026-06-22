'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Modal } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';

import { makeSdk } from '@/lib/sdk';
import type { Project, Queue } from '@/types';

export default function QueuesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingQueues, setLoadingQueues] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('redis');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoadingProjects(false); return; }
      try {
        const sdk = makeSdk(token);
        const data = await sdk.projects.list();
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0].id);
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadQueues() {
      setLoadingQueues(true);
      setError(null);
      try {
        const token = localStorage.getItem('fidscript_token');
        if (!token) return;
        const sdk = makeSdk(token);
        const data = await sdk.queues.list(selectedProjectId);
        setQueues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load queues');
      } finally {
        setLoadingQueues(false);
      }
    }
    loadQueues();
  }, [selectedProjectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !selectedProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = makeSdk(token);
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
          <h1 className="text-xl font-bold text-slate-200 mb-1">Queues</h1>
          <p className="text-sm text-slate-500">
            {queues.length} queue{queues.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Queue
        </Button>
      </div>

      <div className="mb-6">
        <label className="block text-xs text-slate-400 mb-1">Project</label>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm min-w-52"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-400 mb-4 text-sm">{error}</p>
      )}

      {loadingQueues ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : queues.length === 0 ? (
        <Card className="border border-[#1e2130]">
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
        <Card className="border border-[#1e2130] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Type</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Created</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queues.map(queue => (
                <tr
                  key={queue.id}
                  className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30 cursor-pointer"
                  onClick={() => router.push(`/queues/${queue.id}?project=${selectedProjectId}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-200">{queue.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#1e2130] text-slate-400 border border-[#1e2130]">
                      {queue.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      queue.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {queue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(queue.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/queues/${queue.id}?project=${selectedProjectId}`)}
                        className="text-xs text-slate-400 hover:text-slate-200 bg-none border-none cursor-pointer p-0"
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
              <label className="block text-xs text-slate-400 mb-1">Queue name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="my-queue"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="redis">Redis</option>
                <option value="nats">NATS</option>
                <option value="memory">Memory</option>
              </select>
            </div>
            {createError && (
              <p className="text-red-400 text-xs">{createError}</p>
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