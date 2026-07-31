'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useQueuesRealtime } from './use-queues-realtime';
import { QueueCard } from './queue-card';
import type { QueueStats } from './use-queues-realtime';

interface Queue {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export function QueuesList() {
  const { getSdk, getToken } = useAuth();
  const projectId = useShellProjectId();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueStats, setQueueStats] = useState<Record<string, QueueStats>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('jetstream');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Queue | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadQueues = useCallback(async () => {
    const sdk = getSdk();
    if (!projectId) return;
    try {
      const list = await sdk.queues.list(projectId);
      setQueues(list);

      const stats: Record<string, QueueStats> = {};
      await Promise.all(
        list.map(async (q) => {
          try {
            const s = await sdk.queues.getStats(projectId, q.id);
            stats[q.id] = {
              pending: s.pending,
              delivered: s.delivered,
              deadLettered: s.deadLettered,
              jsDepth: s.jsDepth,
            };
          } catch {
            stats[q.id] = { pending: 0, delivered: 0, deadLettered: 0, jsDepth: 0 };
          }
        }),
      );
      setQueueStats(stats);
    } catch (err) {
      console.error('Failed to load queues', err);
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId]);

  useEffect(() => { loadQueues(); }, [loadQueues]);

  useQueuesRealtime(getSdk, getToken, projectId, {
    onQueueCreated: (q) => { setQueues((prev) => [...prev, q]); },
    onQueueDeleted: (q) => { setQueues((prev) => prev.filter((x) => x.id !== q.id)); },
    onQueueUpdated: (q) => { setQueues((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...q } : x))); },
    onStatsUpdated: (queueId, stats) => {
      setQueueStats((prev) => ({ ...prev, [queueId]: { ...prev[queueId]!, ...stats } }));
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !createName.trim()) return;
    setCreating(true);
    try {
      const sdk = getSdk();
      await sdk.queues.create(projectId, { name: createName.trim(), type: createType });
      setShowCreate(false);
      setCreateName('');
      setCreateType('jetstream');
      await loadQueues();
    } catch (err) {
      console.error('Failed to create queue', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId || !deleteTarget) return;
    setDeleting(true);
    try {
      const sdk = getSdk();
      await sdk.queues.delete(projectId, deleteTarget.id);
      setDeleteTarget(null);
      await loadQueues();
    } catch (err) {
      console.error('Failed to delete queue', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-dim)]">
        <Icon icon="icons8:info" width={20} className="mr-2" />
        No project selected.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation Banner */}
      <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon icon="icons8:info" width={16} height={16} className="text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">What are Queues?</h3>
            <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-2xl">
              Queues let you reliably handle background tasks like sending emails, processing images, or dispatching notifications.
              Messages are stored durably and delivered to consumers at least once — even if your service restarts.
              Failed messages can be automatically retried or moved to a dead-letter queue for manual inspection.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Queues</h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            {loading ? 'Loading…' : `${queues.length} queue${queues.length !== 1 ? 's' : ''} in this project`}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
          <Icon icon="icons8:plus" width={14} height={14} />
          New Queue
        </Button>
      </div>

      {/* Queue Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] animate-pulse" />
          ))}
        </div>
      ) : queues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] flex items-center justify-center mb-4">
            <Icon icon="icons8:share" width={24} height={24} className="text-[var(--text-dim)]" />
          </div>
          <h3 className="text-sm font-medium text-[var(--text)] mb-1">No queues yet</h3>
          <p className="text-xs text-[var(--text-dim)] max-w-xs">
            Create your first queue to start processing background tasks reliably.
          </p>
          <Button onClick={() => setShowCreate(true)} size="sm" className="mt-4 gap-1.5">
            <Icon icon="icons8:plus" width={13} height={13} />
            Create Queue
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map((queue) => (
            <QueueCard
              key={queue.id}
              queue={queue}
              stats={queueStats[queue.id]}
              projectId={projectId}
              onDelete={(q) => setDeleteTarget(q)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--rail)] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--rail)]">
              <h2 className="text-sm font-semibold text-[var(--text)]">Create New Queue</h2>
              <button
                onClick={() => !creating && setShowCreate(false)}
                className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
              >
                <Icon icon="icons8:cancel" width={14} height={14} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-dim)] mb-1.5">Queue Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. email-sender"
                  className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)]/40 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-dim)] mb-1.5">Queue Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'jetstream', label: 'NATS JetStream', icon: 'icons8:share', desc: 'High-throughput, durable' },
                    { value: 'redis', label: 'Redis', icon: 'icons8:database', desc: 'In-memory, fast' },
                  ].map(({ value, label, icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCreateType(value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        createType === value
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                          : 'border-[var(--rail)] hover:border-[var(--accent)]/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon icon={icon} width={13} height={13} className={createType === value ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'} />
                        <span className="text-xs font-medium text-[var(--text)]">{label}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-dim)]">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!createName.trim() || creating}>
                  {creating ? 'Creating…' : 'Create Queue'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--rail)] rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--rail)]">
              <h2 className="text-sm font-semibold text-[var(--text)]">Delete Queue</h2>
              <button
                onClick={() => !deleting && setDeleteTarget(null)}
                className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
              >
                <Icon icon="icons8:cancel" width={14} height={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-[var(--text-dim)]">
                Are you sure you want to delete{' '}
                <span className="font-medium text-[var(--text)]">{deleteTarget.name}</span>?
                This will permanently remove all queued messages and cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                >
                  {deleting ? 'Deleting…' : 'Delete Queue'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
