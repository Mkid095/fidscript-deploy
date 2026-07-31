'use client';

import { Card, EmptyState, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Attachment01Icon } from '@hugeicons/core-free-icons';
import type { PlatformMailboxMessage } from '@fidscript-deploy/sdk';

type Folder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';

const FOLDER_LABELS: Record<Folder, string> = {
  inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts',
  trash: 'Trash', junk: 'Junk', archive: 'Archive',
};

const FOLDER_ICONS: Record<Folder, string> = {
  inbox: '', sent: '', drafts: '✎', trash: '🗑', junk: '', archive: '◰',
};

function timeAgo(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  messages: PlatformMailboxMessage[];
  total: number;
  activeFolder: Folder;
  selectedMessageId?: string;
  loading: boolean;
  onSelect: (msg: PlatformMailboxMessage) => void;
}

export function PlatformEmailMessageList({ messages, total, activeFolder, selectedMessageId, loading, onSelect }: Props) {
  return (
    <>
      <div className="flex gap-1 mb-2 border-b border-[var(--rail)]">
        {(['inbox', 'sent', 'drafts', 'junk', 'trash', 'archive'] as Folder[]).map(f => (
          <span key={f} className={`px-3 py-2 text-xs ${f === activeFolder ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
            {FOLDER_ICONS[f]} {FOLDER_LABELS[f]}
          </span>
        ))}
      </div>

      <Card className="flex-1 overflow-y-auto border border-[var(--rail)] p-0">
        {loading && !messages.length ? (
          <div className="flex items-center justify-center min-h-48"><Spinner /></div>
        ) : messages.length === 0 ? (
          <EmptyState title={`No ${FOLDER_LABELS[activeFolder].toLowerCase()}`} description="No messages here yet." />
        ) : (
          <div className="divide-y divide-[var(--rail)]">
            {messages.map(m => (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className={`w-full text-left p-3 hover:bg-[var(--rail)] transition-colors ${
                  selectedMessageId === m.id ? 'bg-[var(--rail)]' : ''
                } ${!m.isRead ? 'font-semibold' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-muted)] truncate max-w-32">
                    {m.fromName || m.from || '(no sender)'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(m.receivedAt)}</span>
                </div>
                <div className="text-sm text-[var(--text)] truncate mb-0.5">{m.subject || '(no subject)'}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">{m.preview}</div>
                <div className="flex items-center gap-1 mt-1">
                  {m.isStarred && <span className="text-[var(--warning)] text-[10px]">★</span>}
                  {m.hasAttachments && (
                    <HugeiconsIcon icon={Attachment01Icon} size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                  )}
                  {!m.isRead && <span className="bg-[var(--accent)] w-1.5 h-1.5 rounded-full"></span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
      <p className="text-xs text-[var(--text-muted)] mt-2 px-1">{total} message{total !== 1 ? 's' : ''}</p>
    </>
  );
}
