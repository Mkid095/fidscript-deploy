'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, Button, Modal, Spinner, EmptyState } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Queue, QueueMessage } from '@/types';

type Tab = 'messages' | 'dlq';

interface QueueStats {
  pending: number;
  delivered: number;
  deadLettered: number;
  jsDepth: number;
}

export default function QueueDetailPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const queueId = params.name as string;
  const projectId = searchParams.get('project') ?? '';

  const [queue, setQueue] = useState<Queue | null>(null);
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [dlqMessages, setDlqMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('messages');
  const [showPublish, setShowPublish] = useState(false);
  const [publishPayload, setPublishPayload] = useState('{}');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [showPurge, setShowPurge] = useState(false);
  const [purgeDlq, setPurgeDlq] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (!projectId || !queueId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const [queueData, msgs] = await Promise.all([
          sdk.queues.get(projectId, queueId),
          sdk.queues.consume(projectId, queueId, 50, 10),
        ]);
        setQueue(queueData);
        setMessages(msgs.filter(m => m.status !== 'dead-letter'));
        setDlqMessages(msgs.filter(m => m.status === 'dead-letter'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load queue');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, queueId, getSdk]);

  useEffect(() => {
    if (!projectId || !queueId) return;
    async function loadStats() {
      try {
        const sdk = getSdk();
        const s = await sdk.queues.getStats(projectId, queueId);
        setStats({ pending: s.pending, delivered: s.delivered, deadLettered: s.deadLettered, jsDepth: s.jsDepth });
      } catch { /* ignore */ }
    }
    loadStats();
  }, [projectId, queueId, getSdk]);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !queueId) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const sdk = getSdk();
      const parsed = (() => { try { return JSON.parse(publishPayload); } catch { return publishPayload; } })();
      await sdk.queues.publish(projectId, queueId, parsed);
      setShowPublish(false);
      setPublishPayload('{}');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish message');
    } finally {
      setPublishing(false);
    }
  }

  async function handlePurge() {
    if (!projectId || !queueId) return;
    setPurging(true);
    try {
      const sdk = getSdk();
      await sdk.queues.purge(projectId, queueId, purgeDlq);
      setShowPurge(false);
      setPurgeDlq(false);
      setMessages([]);
      setDlqMessages([]);
      const s = await sdk.queues.getStats(projectId, queueId);
      setStats({ pending: s.pending, delivered: s.delivered, deadLettered: s.deadLettered, jsDepth: s.jsDepth });
    } finally {
      setPurging(false);
    }
  }

  async function handleRequeue(msgId: string) {
    if (!projectId || !queueId) return;
    setActionLoading(msgId);
    try {
      const sdk = getSdk();
      await sdk.queues.retry(projectId, queueId, [msgId]);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDiscard(msgId: string) {
    if (!projectId || !queueId) return;
    setActionLoading(msgId);
    try {
      const sdk = getSdk();
      await sdk.queues.ack(projectId, queueId, [msgId]);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setDlqMessages(prev => prev.filter(m => m.id !== msgId));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>;
  }

  if (error || !queue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <p className="text-red-400 text-sm">{error ?? 'Queue not found'}</p>
        <Button variant="ghost" size="sm" onClick={() => history.back()}>Go back</Button>
      </div>
    );
  }

  const visibleMessages = tab === 'messages' ? messages : dlqMessages;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-200">{queue.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${queue.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              {queue.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">{queue.type} &middot; {queue.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <div className="flex items-center gap-3 mr-2 text-xs text-slate-500">
              <span>Pending: <span className="text-slate-300">{stats.pending}</span></span>
              <span>DLQ: <span className="text-slate-300">{stats.deadLettered}</span></span>
              <span>Stream: <span className="text-slate-300">{stats.jsDepth}</span></span>
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowPurge(true)} className="text-red-400 border-red-900/40 hover:border-red-700">
            Purge
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowPublish(true)}>
            Publish Message
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#1e2130]">
        {(['messages', 'dlq'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t ? 'border-red-500 text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-300 bg-none border-none cursor-pointer'}`}
          >
            {t === 'messages' ? 'Messages' : 'Dead Letter'}
            <span className="ml-2 text-xs text-slate-600">({t === 'messages' ? messages.length : dlqMessages.length})</span>
          </button>
        ))}
      </div>

      {visibleMessages.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title={tab === 'messages' ? 'No messages' : 'No dead-letter messages'}
            description={tab === 'messages' ? 'This queue has no pending messages.' : 'No messages have failed processing.'}
          />
        </Card>
      ) : (
        <Card className="border border-[#1e2130] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">ID</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Payload</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Attempts</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Received</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleMessages.map(msg => {
                let preview = msg.body;
                try { preview = JSON.stringify(JSON.parse(msg.body)).slice(0, 80); } catch { /* raw */ }
                if (preview.length === 80) preview += '...';

                return (
                  <tr key={msg.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                    <td className="px-4 py-3"><span className="font-mono text-xs text-slate-400">{msg.id.slice(0, 12)}…</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-400 font-mono">{preview}</span></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{msg.attempts}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        msg.status === 'dead-letter' ? 'bg-red-500/10 text-red-400' :
                        msg.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>{msg.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(msg.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRequeue(msg.id)} disabled={actionLoading === msg.id} className="text-xs text-slate-400 hover:text-slate-200 bg-none border-none cursor-pointer p-0 disabled:opacity-50">Requeue</button>
                        <button onClick={() => handleDiscard(msg.id)} disabled={actionLoading === msg.id} className="text-xs text-red-400 hover:text-red-300 bg-none border-none cursor-pointer p-0 disabled:opacity-50">Discard</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Publish Modal */}
      <Modal isOpen={showPublish} onClose={() => setShowPublish(false)} title="Publish Message" size="lg">
        <form onSubmit={handlePublish} noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Payload (JSON)</label>
              <textarea
                value={publishPayload}
                onChange={e => setPublishPayload(e.target.value)}
                rows={8}
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm font-mono resize-y"
                placeholder='{"key": "value"}'
              />
            </div>
            {publishError && <p className="text-red-400 text-xs">{publishError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowPublish(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" loading={publishing}>{publishing ? 'Publishing...' : 'Publish'}</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Purge Modal */}
      <Modal isOpen={showPurge} onClose={() => setShowPurge(false)} title="Purge Queue" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            This will permanently delete all <span className="text-slate-200">{stats?.pending ?? 0}</span> pending messages from this queue.
            This action cannot be undone.
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={purgeDlq}
              onChange={e => setPurgeDlq(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            Also purge dead-letter queue
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPurge(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              loading={purging}
              onClick={handlePurge}
              className="bg-red-600 hover:bg-red-700 border-none"
            >
              {purging ? 'Purging...' : 'Purge'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
