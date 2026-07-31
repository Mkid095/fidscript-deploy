'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { FlashIcon, Delete01Icon, LockKeyIcon, Globe02Icon, RefreshIcon, Add01Icon } from '@hugeicons/core-free-icons';
import { Button, Card, Input, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useProjectContext } from '@/contexts/project-context';
import { useToast } from '@/components/toast-provider';
import type { Project } from '@/types';

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

interface RealtimeChannelListProps {
  channels: Channel[];
  loading: boolean;
  showCreate: boolean;
  newName: string;
  newPrivate: boolean;
  creating: boolean;
  deleting: string | null;
  onRefresh: () => void;
  onShowCreateToggle: () => void;
  onNewNameChange: (v: string) => void;
  onNewPrivateChange: (v: boolean) => void;
  onCreate: (e: React.FormEvent) => void;
  onDelete: (ch: Channel) => void;
}

export function RealtimeChannelList({
  channels,
  loading,
  showCreate,
  newName,
  newPrivate,
  creating,
  deleting,
  onRefresh,
  onShowCreateToggle,
  onNewNameChange,
  onNewPrivateChange,
  onCreate,
  onDelete,
}: RealtimeChannelListProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          Channels
          <span className="text-xs font-normal text-[var(--text-dim)]">{channels.length}</span>
        </h2>
        <button onClick={onRefresh} title="Refresh" className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors">
          <HugeiconsIcon icon={RefreshIcon} size={14} />
        </button>
      </div>

      {showCreate && (
        <Card className="border border-[var(--rail)] p-4 mb-3">
          <form onSubmit={onCreate} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Channel name</label>
              <Input value={newName} onChange={e => onNewNameChange(e.target.value)} placeholder="e.g. live-scores, notifications" autoFocus className="w-full" />
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none h-9">
              <input type="checkbox" checked={newPrivate} onChange={e => onNewPrivateChange(e.target.checked)} className="accent-[var(--accent)]" />
              Private
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { onShowCreateToggle(); onNewNameChange(''); onNewPrivateChange(false); }}>Cancel</Button>
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
          <p className="text-xs text-[var(--text-dim)] mt-1">Create a channel for clients to join, broadcast messages, and track presence.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {channels.map(ch => (
            <Card key={ch.id} className="border border-[var(--rail)] p-4 flex items-start justify-between gap-3 group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)] truncate">{ch.name}</span>
                  <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                    ch.isPrivate ? 'text-amber-300 bg-amber-500/10 border-amber-500/25' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                  }`}>
                    <HugeiconsIcon icon={ch.isPrivate ? LockKeyIcon : Globe02Icon} size={10} />
                    {ch.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] mt-1.5">Created {relativeTime(ch.createdAt)}</p>
                <p className="text-[10px] text-[var(--text-dim)] mt-1 font-mono truncate">{ch.id}</p>
              </div>
              <button
                onClick={() => onDelete(ch)}
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
  );
}
