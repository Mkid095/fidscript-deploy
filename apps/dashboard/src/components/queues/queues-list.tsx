'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon, Share01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useQueuesRealtime } from './use-queues-realtime';
import { QueueCard } from './queue-card';
import { QueuesListHeader } from './queues-list-header';
import { QueuesCreateModal } from './queues-create-modal';
import { QueuesExplanationBanner } from './queues-explanation-banner';
import { QueuesDeleteConfirmation } from './queues-delete-confirmation';
import { useQueuesListHandlers } from './queues-list-handlers';
import type { QueueStats } from './use-queues-realtime';
import type { Queue } from './queue-card';

export function QueuesList() {
  const { getSdk, getToken } = useAuth();
  const projectId = useShellProjectId();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueStats, setQueueStats] = useState<Record<string, QueueStats>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Queue | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { loadQueues, handleCreate, handleDelete } = useQueuesListHandlers({
    projectId,
    getSdk,
    setQueues,
    setQueueStats,
    setShowCreate,
    setCreating,
    setDeleteTarget,
    setDeleting,
  });

  useEffect(() => {
    setLoading(true);
    loadQueues().finally(() => setLoading(false));
  }, [loadQueues]);

  useQueuesRealtime(getSdk, getToken, projectId, {
    onQueueCreated: (q) => { setQueues((prev) => [...prev, q]); },
    onQueueDeleted: (q) => { setQueues((prev) => prev.filter((x) => x.id !== q.id)); },
    onQueueUpdated: (q) => { setQueues((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...q } : x))); },
    onStatsUpdated: (queueId, stats) => {
      setQueueStats((prev) => ({ ...prev, [queueId]: { ...prev[queueId]!, ...stats } }));
    },
  });

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-dim)]">
        <HugeiconsIcon icon={InformationCircleIcon} size={20} className="mr-2" />
        No project selected.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QueuesExplanationBanner />
      <QueuesListHeader
        queueCount={queues.length}
        loading={loading}
        onNewQueue={() => setShowCreate(true)}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] animate-pulse" />
          ))}
        </div>
      ) : queues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] flex items-center justify-center mb-4">
            <HugeiconsIcon icon={Share01Icon} size={24} className="text-[var(--text-dim)]" />
          </div>
          <h3 className="text-sm font-medium text-[var(--text)] mb-1">No queues yet</h3>
          <p className="text-xs text-[var(--text-dim)] max-w-xs">
            Create your first queue to start processing background tasks reliably.
          </p>
          <Button onClick={() => setShowCreate(true)} size="sm" className="mt-4 gap-1.5">
            <HugeiconsIcon icon={Add01Icon} size={13} />
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

      {showCreate && (
        <QueuesCreateModal
          onClose={() => setShowCreate(false)}
          onConfirm={handleCreate}
          submitting={creating}
        />
      )}

      {deleteTarget && (
        <QueuesDeleteConfirmation
          target={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  );
}
