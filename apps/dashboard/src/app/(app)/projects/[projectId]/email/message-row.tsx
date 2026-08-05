'use client';

import type { MailboxMessage } from '@fidscript-deploy/sdk';

import { Button } from '@fidscript/ui';
import { MESSAGE_STATUS_TONE, fmtDate, truncate } from './email-shared';

interface Props {
  message: MailboxMessage;
  busy: boolean;
  onToggleStar: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}

export function MessageRow({ message, busy, onToggleStar, onToggleRead, onDelete }: Props) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 px-3 py-2 border-b border-[var(--rail)] text-xs hover:bg-[var(--surface-2)]">
      <button
        type="button"
        onClick={onToggleStar}
        disabled={busy}
        aria-label={message.isStarred ? 'Unstar' : 'Star'}
        className="col-span-1 text-center text-[var(--text-dim)] hover:text-[var(--accent)]"
      >
        {message.isStarred ? '*' : '·'}
      </button>
      <div className="col-span-3 truncate">
        <button
          type="button"
          onClick={onToggleRead}
          disabled={busy}
          className={`text-left w-full truncate ${message.isRead ? 'text-[var(--text-dim)]' : 'font-semibold text-[var(--text)]'}`}
        >
          {message.from || '(unknown sender)'}
        </button>
      </div>
      <div className="col-span-5 truncate">
        <button
          type="button"
          onClick={onToggleRead}
          disabled={busy}
          className={`text-left w-full truncate ${message.isRead ? 'text-[var(--text-dim)]' : 'text-[var(--text)]'}`}
        >
          {message.subject || '(no subject)'}
        </button>
      </div>
      <span className="col-span-2 text-[10px] text-[var(--text-dim)]">{fmtDate(message.createdAt)}</span>
      <div className="col-span-1 text-right">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          MESSAGE_STATUS_TONE[message.status] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'
        }`}>
          {truncate(message.status, 6)}
        </span>
      </div>
      <div className="col-span-12 mt-1 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="text-rose-400 hover:bg-rose-500/10"
          onClick={onDelete}
          loading={busy}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
