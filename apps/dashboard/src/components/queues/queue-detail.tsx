'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Button } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useQueuesRealtime } from './use-queues-realtime';
import { PublishMessageModal } from './publish-message-modal';
import { PurgeQueueModal } from './purge-queue-modal';
import type { QueueStats } from './use-queues-realtime';

interface Queue {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface QueueMessage {
  id: string;
  body: string;
  status: string;
  attempts: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  redis:    'Redis',
  jetstream: 'NATS JetStream',
  nats:      'NATS',
  memory:    'Memory',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  delivered:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'dead-letter': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  active:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  paused:     'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

type MessageTab = 'pending' | 'delivered' | 'dead-letter';

export function QueueDetail({ queueId }: { queueId: string }) {
  const { getSdk, getToken } = useAuth();
  const projectId = useShellProjectId();
  const router = useRouter();

  const [queue, setQueue] = useState<Queue | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MessageTab>('pending');
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
    onStatsUpdated: (qid, s) => { if (qid === queueId) setStats(prev => prev ? { ...prev, ...s } : prev); },
    onQueueDeleted: (q) => { if (q.id === queueId) router.push(`/projects/${projectId}/queues`); },
  });

  const handleTabChange = async (tab: MessageTab) => {
    setActiveTab(tab);
    setSelected(new Set());
    const sdk = getSdk();
    if (!projectId) return;
    try {
      const res = await sdk.queues.getMessages(projectId, queueId, { status: tab, limit: 50 });
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleConsume = async () => {
    const sdk = getSdk();
    if (!projectId) return;
    setConsuming(true);
    try {
      const msgs = await sdk.queues.consume(projectId, queueId, 10, 30);
      setMessages((prev) => [...msgs, ...prev].slice(0, 50));
      await loadQueue();
    } catch (err) {
      console.error('Failed to consume messages', err);
    } finally {
      setConsuming(false);
    }
  };

  const handleAck = async () => {
    if (!projectId || selected.size === 0) return;
    const sdk = getSdk();
    setActionLoading(true);
    try {
      await sdk.queues.ack(projectId, queueId, Array.from(selected));
      setMessages((prev) => prev.filter((m) => !selected.has(m.id)));
      setSelected(new Set());
      await loadQueue();
    } catch (err) {
      console.error('Failed to ack messages', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!projectId || selected.size === 0) return;
    const sdk = getSdk();
    setActionLoading(true);
    try {
      await sdk.queues.retry(projectId, queueId, Array.from(selected));
      setMessages((prev) =>
        prev.map((m) => selected.has(m.id) ? { ...m, status: 'pending' as const, attempts: 0 } : m),
      );
      setSelected(new Set());
      await loadQueue();
    } catch (err) {
      console.error('Failed to retry messages', err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === messages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(messages.map((m) => m.id)));
    }
  };

  if (!projectId) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        <div className="h-24 bg-[var(--surface-2)] rounded-xl animate-pulse" />
        <div className="h-64 bg-[var(--surface-2)] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!queue) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[var(--text-dim)]">Queue not found.</p>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}/queues`)} className="mt-3">
          Back to queues
        </Button>
      </div>
    );
  }

  const typeLabel = TYPE_LABELS[queue.type] ?? queue.type;

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/projects/${projectId}/queues`)}
          className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/30 transition-all"
        >
          <Icon icon="icons8:chevron-left" width={14} height={14} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-base font-semibold text-[var(--text)]">{queue.name}</h1>
              {queue.status && (
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLORS[queue.status] ?? ''}`}>
                  {queue.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
              <span>{typeLabel}</span>
              <span>·</span>
              <span>ID: {queue.id}</span>
              <span>·</span>
              <span>Created {new Date(queue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending', value: stats.pending, icon: 'icons8:tasks', iconColor: 'text-amber-400' },
            { label: 'Delivered', value: stats.delivered, icon: 'icons8:checked', iconColor: 'text-emerald-400' },
            { label: 'Dead-Lettered', value: stats.deadLettered, icon: 'icons8:cancel', iconColor: 'text-rose-400' },
            { label: 'Stream Depth', value: stats.jsDepth, icon: 'icons8:database', iconColor: 'text-[var(--text-dim)]' },
          ].map(({ label, value, icon, iconColor }) => (
            <div key={label} className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon icon={icon} width={12} height={12} className={iconColor} />
                <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-lg font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowPublish(true)} className="gap-1.5">
            <Icon icon="icons8:share" width={13} height={13} />
            Publish
          </Button>
          <Button size="sm" variant="secondary" onClick={handleConsume} disabled={consuming} className="gap-1.5">
            <Icon icon="icons8:download" width={13} height={13} />
            {consuming ? 'Consuming…' : 'Consume'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPurge(true)} className="gap-1.5 text-rose-400 hover:bg-rose-500/10">
            <Icon icon="icons8:trash" width={13} height={13} />
            Purge
          </Button>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)]">{selected.size} selected</span>
            <Button size="sm" variant="secondary" onClick={handleAck} disabled={actionLoading} className="gap-1.5">
              <Icon icon="icons8:checkmark" width={13} height={13} />
              Ack
            </Button>
            <Button size="sm" variant="secondary" onClick={handleRetry} disabled={actionLoading} className="gap-1.5">
              <Icon icon="icons8:refresh" width={13} height={13} />
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Message Table */}
      <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center border-b border-[var(--rail)] px-4 gap-1 overflow-x-auto">
          {(['pending', 'delivered', 'dead-letter'] as MessageTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              {tab === 'dead-letter' ? 'Dead Letter' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {stats && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                  tab === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-rose-500/10 text-rose-400'
                }`}>
                  {tab === 'pending' ? stats.pending : tab === 'delivered' ? stats.delivered : stats.deadLettered}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--rail)] flex items-center justify-center mb-3">
              <Icon icon="icons8:document" width={20} height={20} className="text-[var(--text-dim)]" />
            </div>
            <p className="text-xs text-[var(--text-dim)]">No {activeTab} messages</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--rail)]">
                  <th className="w-8 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.size === messages.length && messages.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Message ID</th>
                  <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Body</th>
                  <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Attempts</th>
                  <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Received</th>
                  <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    className={`border-b border-[var(--rail)] last:border-0 hover:bg-[var(--surface)]/50 transition-colors cursor-pointer ${selected.has(msg.id) ? 'bg-[var(--accent)]/5' : ''}`}
                    onClick={() => toggleSelect(msg.id)}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(msg.id)}
                        onChange={() => toggleSelect(msg.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-dim)] font-mono text-[10px]">{msg.id}</td>
                    <td className="px-3 py-2.5 max-w-xs truncate font-mono text-[10px] text-[var(--text)]" title={msg.body}>
                      {msg.body.length > 80 ? msg.body.slice(0, 80) + '…' : msg.body}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-dim)]">
                      {msg.attempts > 0 && (
                        <span className={`inline-flex items-center gap-1 ${msg.attempts >= 3 ? 'text-rose-400' : 'text-amber-400'}`}>
                          <Icon icon="icons8:refresh" width={10} height={10} />
                          {msg.attempts}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-dim)] whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLORS[msg.status] ?? ''}`}>
                        {msg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPublish && queue && (
        <PublishMessageModal
          queueId={queueId}
          queueName={queue.name}
          projectId={projectId}
          getSdk={getSdk}
          onClose={() => setShowPublish(false)}
          onPublished={loadQueue}
        />
      )}

      {showPurge && queue && (
        <PurgeQueueModal
          queueId={queueId}
          queueName={queue.name}
          projectId={projectId}
          getSdk={getSdk}
          onClose={() => setShowPurge(false)}
          onPurged={loadQueue}
        />
      )}
    </div>
  );
}
