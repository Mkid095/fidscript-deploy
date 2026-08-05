'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useQueuesRealtime } from './use-queues-realtime';
import { QueueMessagesTable } from './queue-messages-table';
import { QueueDetailHeader } from './queue-detail-header';
import { QueueDetailStatsBar } from './queue-detail-stats-bar';
import { QueueDetailModals } from './queue-detail-modals';
import { QueueDetailLoading } from './queue-detail-loading';
import { QueueDetailNotFound } from './queue-detail-not-found';
import { QueueDetailActionsToolbar } from './queue-detail-actions-toolbar';
import { useQueueDetailHandlers } from './queue-detail-handlers';
import type { Queue, QueueStats, QueueMessage } from './use-queues-realtime';

export function QueueDetail({ queueId }: { queueId: string }) {
  const { getSdk, getToken } = useAuth();
  const projectId = useShellProjectId();
  const router = useRouter();

  const [queue, setQueue] = useState<Queue | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered' | 'dead-letter'>('pending');
  const [showPublish, setShowPublish] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [consuming, setConsuming] = useState(false);

  const loadQueue = useCallback(async () => {
    const sdk = getSdk();
    if (!projectId) return;
    try {
      const [q, s, msgResult] = await Promise.all([
        sdk.queues.get(projectId, queueId),
        sdk.queues.getStats(projectId, queueId),
        sdk.queues.getMessages(projectId, queueId, { limit: 50 }),
      ]);
      setQueue(q);
      setStats({ pending: s.pending, delivered: s.delivered, deadLettered: s.deadLettered, jsDepth: s.jsDepth });
      setMessages(msgResult.messages);
    } catch (err) {
      console.error('Failed to load queue', err);
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId, queueId]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  useQueuesRealtime(getSdk, getToken, projectId, {
    onQueueUpdated: (q) => { if (q.id === queueId) setQueue((prev) => prev ? { ...prev, ...q } : prev); },
    onStatsUpdated: (qid, s) => { if (qid === queueId) setStats((prev) => prev ? { ...prev, ...s } : prev); },
    onQueueDeleted: (q) => { if (q.id === queueId) router.push(`/projects/${projectId}/queues`); },
  });

  const {
    handleTabChange,
    handleConsume,
    handleAck,
    handleRetry,
    toggleSelect,
    toggleSelectAll,
  } = useQueueDetailHandlers({
    projectId,
    queueId,
    selected,
    getSdk,
    loadQueue,
    setMessages,
    setSelected,
    setActiveTab,
    setConsuming,
    setActionLoading,
  });

  if (!projectId) return null;
  if (loading) return <QueueDetailLoading />;
  if (!queue) return <QueueDetailNotFound projectId={projectId} onBack={() => router.push(`/projects/${projectId}/queues`)} />;

  return (
    <div className="space-y-5">
      <QueueDetailHeader queue={queue} projectId={projectId} />
      <QueueDetailStatsBar stats={stats} />
      <QueueDetailActionsToolbar
        selectedCount={selected.size}
        consuming={consuming}
        actionLoading={actionLoading}
        onPublish={() => setShowPublish(true)}
        onConsume={handleConsume}
        onPurge={() => setShowPurge(true)}
        onAck={handleAck}
        onRetry={handleRetry}
      />
      <QueueMessagesTable
        messages={messages}
        stats={stats}
        activeTab={activeTab}
        selected={selected}
        onTabChange={handleTabChange}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={() => toggleSelectAll(messages)}
      />
      <QueueDetailModals
        queueId={queueId}
        queue={queue}
        projectId={projectId}
        showPublish={showPublish}
        showPurge={showPurge}
        getSdk={getSdk}
        onClosePublish={() => setShowPublish(false)}
        onClosePurge={() => setShowPurge(false)}
        onPublished={loadQueue}
        onPurged={loadQueue}
      />
    </div>
  );
}
