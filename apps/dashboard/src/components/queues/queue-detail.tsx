'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useQueuesRealtime } from './use-queues-realtime';
import { useQueueDetailData } from './use-queue-detail-data';
import { QueueMessagesTable } from './queue-messages-table';
import { QueueDetailHeader } from './queue-detail-header';
import { QueueDetailStatsBar } from './queue-detail-stats-bar';
import { QueueDetailModals } from './queue-detail-modals';
import { QueueDetailLoading } from './queue-detail-loading';
import { QueueDetailNotFound } from './queue-detail-not-found';
import { QueueDetailActionsToolbar } from './queue-detail-actions-toolbar';
import { useQueueDetailHandlers } from './queue-detail-handlers';

export function QueueDetail({ queueId }: { queueId: string }) {
  const { getSdk, getToken } = useAuth();
  const projectId = useShellProjectId();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'pending' | 'delivered' | 'dead-letter'>('pending');
  const [showPublish, setShowPublish] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [consuming, setConsuming] = useState(false);

  const { queue, stats, messages, loading, loadQueue, setMessages } = useQueueDetailData({
    projectId,
    queueId,
    getSdk,
  });

  useQueuesRealtime(getSdk, getToken, projectId, {
    onQueueUpdated: (q) => { if (q.id === queueId) { loadQueue(); } },
    onStatsUpdated: (qid, s) => { if (qid === queueId) { loadQueue(); } },
    onQueueDeleted: (q) => { if (q.id === queueId) router.push(`/projects/${projectId}/queues`); },
  });

  const {
    handleTabChange,
    handleConsume,
    handleAck,
    handleRetry,
    handleDeadLetter,
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
        onDeadLetter={handleDeadLetter}
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
