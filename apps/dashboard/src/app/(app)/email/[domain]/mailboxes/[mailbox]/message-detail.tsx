'use client';

import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon,
  StarIcon,
  StarOffIcon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import type { MailboxMessage } from '@fidscript-deploy/sdk';

const STATUS_PALETTE: Record<string, string> = {
  QUEUED: 'bg-yellow-900/30 text-[var(--warning)] border-yellow-800/60',
  SUBMITTED: 'bg-[var(--accent)]/10 text-[var(--accent)] border-blue-800/60',
  ACCEPTED: 'bg-emerald-900/30 text-[var(--success)] border-[var(--success)]/30/60',
  DELIVERED: 'bg-emerald-900/30 text-[var(--success)] border-[var(--success)]/30/60',
  BOUNCED: 'bg-red-900/30 text-[var(--danger)] border-[var(--danger)]/30/60',
  FAILED: 'bg-red-900/30 text-[var(--danger)] border-[var(--danger)]/30/60',
};

export function MessagePreview({
  message,
  onToggleRead,
  onToggleStar,
  onDelete,
}: {
  message: MailboxMessage;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--text)] truncate">{message.subject}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            <span className="text-[var(--text-muted)]">{message.from}</span>
            {' → '}
            <span className="text-[var(--text-muted)]">{message.to}</span>
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            {new Date(message.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${STATUS_PALETTE[message.status] ?? 'bg-[var(--rail)] text-[var(--text-muted)] border-slate-600'}`}>
          {message.status.toLowerCase()}
        </span>
      </div>

      <div className="border-t border-[var(--rail)] pt-3">
        {message.textBody || message.htmlBody ? (
          message.textBody ? (
            <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{message.textBody}</p>
          ) : (
            <div
              className="text-sm text-[var(--text-muted)] [&_a]:text-[var(--accent)] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: message.htmlBody! }}
            />
          )
        ) : (
          <p className="text-sm text-[var(--text-dim)] italic">(empty message)</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--rail)]">
        <Button variant="ghost" size="sm" onClick={onToggleRead} title={message.isRead ? 'Mark unread' : 'Mark read'}>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          {message.isRead ? 'Unread' : 'Read'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleStar} title={message.isStarred ? 'Unstar' : 'Star'}>
          <HugeiconsIcon icon={message.isStarred ? StarOffIcon : StarIcon} size={14} />
          {message.isStarred ? 'Unstar' : 'Star'}
        </Button>
        <div className="flex-1" />
        <Button variant="danger" size="sm" onClick={onDelete} className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Delete01Icon} size={14} />
          Delete
        </Button>
      </div>
    </div>
  );
}
