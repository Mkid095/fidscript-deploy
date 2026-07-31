'use client';

import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FlashIcon, Add01Icon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';

import { useProjectContext } from '@/contexts/project-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { LiveFeed } from './live-feed';
import { RealtimeChannelList } from './realtime-channel-list';

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export default function RealtimePage() {
  const { project } = useProjectContext();
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrivate, setNewPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const list = await getSdk().realtime.listChannels(project.id);
      setChannels(list as Channel[]);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load channels' });
    } finally {
      setLoading(false);
    }
  }, [project, getSdk, showToast]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !newName.trim()) return;
    setCreating(true);
    try {
      const created = await getSdk().realtime.createChannel(project.id, newName.trim(), newPrivate) as Channel;
      setChannels(prev => [{ ...created }, ...prev]);
      setNewName('');
      setNewPrivate(false);
      setShowCreate(false);
      showToast({ type: 'success', message: `Channel "${created.name}" created` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create channel' });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(ch: Channel) {
    if (!project) return;
    if (!window.confirm(`Delete channel "${ch.name}"? This disconnects all subscribers.`)) return;
    setDeleting(ch.id);
    try {
      await getSdk().realtime.deleteChannel(project.id, ch.id);
      setChannels(prev => prev.filter(c => c.id !== ch.id));
      showToast({ type: 'success', message: `Channel "${ch.name}" deleted` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete channel' });
    } finally {
      setDeleting(null);
    }
  }

  if (!project) return (
    <div className="flex items-center justify-center min-h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <HugeiconsIcon icon={FlashIcon} size={20} className="text-violet-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">Realtime</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Live events &amp; pub/sub channels for <span className="text-[var(--text)]">{project.name}</span>
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(s => !s)} className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Add01Icon} size={14} />
          New channel
        </Button>
      </div>

      {/* Live feed (hero) */}
      <LiveFeed projectId={project.id} />

      {/* Channel list */}
      <RealtimeChannelList
        channels={channels}
        loading={loading}
        showCreate={showCreate}
        newName={newName}
        newPrivate={newPrivate}
        creating={creating}
        deleting={deleting}
        onRefresh={loadChannels}
        onShowCreateToggle={() => setShowCreate(s => !s)}
        onNewNameChange={setNewName}
        onNewPrivateChange={setNewPrivate}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </div>
  );
}
