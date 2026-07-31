'use client';

/**
 * Realtime — the project's live surface.
 *
 * Two halves:
 *   1. Live event stream (LiveFeed) — every platform event for this project,
 *      streamed over the realtime WebSocket the moment it happens.
 *   2. Channels — pub/sub channels clients can join to broadcast messages and
 *      track presence. Create / list / delete.
 *
 * Both are backed by the SDK realtime module + the projects/:id/realtime routes.
 */
import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FlashIcon, Add01Icon, Delete01Icon, LockKeyIcon, Globe02Icon, RefreshIcon,
} from '@hugeicons/core-free-icons';
import { Button, Card, Input, Spinner } from '@fidscript/ui';

import { useProjectContext } from '@/contexts/project-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/toast-provider';
import { LiveFeed } from './live-feed';

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
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
      const created = await getSdk().realtime.createChannel(project.id, newName.trim(), newPrivate);
      setChannels(prev => [{ ...(created as Channel) }, ...prev]);
      setNewName('');
      setNewPrivate(false);
      setShowCreate(false);
      showToast({ type: 'success', message: `Channel "${(created as Channel).name}" created` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create channel' });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(channel: Channel) {
    if (!project) return;
    if (!window.confirm(`Delete channel "${channel.name}"? This disconnects all subscribers.`)) return;
    setDeleting(channel.id);
    try {
      await getSdk().realtime.deleteChannel(project.id, channel.id);
      setChannels(prev => prev.filter(c => c.id !== channel.id));
      showToast({ type: 'success', message: `Channel "${channel.name}" deleted` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete channel' });
    } finally {
      setDeleting(null);
    }
  }

  if (!project) {
    return <div className="flex items-center justify-center min-h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <HugeiconsIcon icon={FlashIcon} size={20} className="text-violet-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
              Realtime
            </h1>
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

      {/* Channels */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            Channels
            <span className="text-xs font-normal text-[var(--text-dim)]">{channels.length}</span>
          </h2>
          <button
            onClick={loadChannels}
            title="Refresh"
            className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
          >
            <HugeiconsIcon icon={RefreshIcon} size={14} />
          </button>
        </div>

        {showCreate && (
          <Card className="border border-[var(--rail)] p-4 mb-3">
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Channel name</label>
                <Input
                  value={newName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                  placeholder="e.g. live-scores, notifications"
                  autoFocus
                  className="w-full"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none h-9">
                <input
                  type="checkbox"
                  checked={newPrivate}
                  onChange={e => setNewPrivate(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Private
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewPrivate(false); }}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" disabled={!newName.trim() || creating} className="flex items-center gap-1.5">
                  {creating ? <Spinner size="sm" /> : <HugeiconsIcon icon={Add01Icon} size={13} />}
                  Create
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="md" /></div>
        ) : channels.length === 0 ? (
          <Card className="border border-dashed border-[var(--rail-light)] p-8 text-center">
            <HugeiconsIcon icon={FlashIcon} size={24} className="text-[var(--text-dim)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No channels yet.</p>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              Create a channel for clients to join, broadcast messages, and track presence.
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {channels.map(ch => (
              <Card key={ch.id} className="border border-[var(--rail)] p-4 flex items-start justify-between gap-3 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text)] truncate">{ch.name}</span>
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                      ch.isPrivate
                        ? 'text-amber-300 bg-amber-500/10 border-amber-500/25'
                        : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                    }`}>
                      <HugeiconsIcon icon={ch.isPrivate ? LockKeyIcon : Globe02Icon} size={10} />
                      {ch.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1.5">Created {relativeTime(ch.createdAt)}</p>
                  <p className="text-[10px] text-[var(--text-dim)] mt-1 font-mono truncate">{ch.id}</p>
                </div>
                <button
                  onClick={() => handleDelete(ch)}
                  disabled={deleting === ch.id}
                  title="Delete channel"
                  className="flex-shrink-0 text-[var(--text-dim)] hover:text-rose-400 transition-colors p-1.5 rounded-md hover:bg-rose-500/10 disabled:opacity-50"
                >
                  {deleting === ch.id ? <Spinner size="sm" /> : <HugeiconsIcon icon={Delete01Icon} size={14} />}
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
