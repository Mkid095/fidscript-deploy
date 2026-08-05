'use client';

import type { Mailbox } from '@fidscript-deploy/sdk';

import { Button, Card } from '@fidscript/ui';
import { MAILBOX_TONE, fmtDate, truncate } from './email-shared';

interface Props {
  mailbox: Mailbox;
  busy: boolean;
  onDelete: () => void;
}

export function MailboxCard({ mailbox, busy, onDelete }: Props) {
  const isActive = mailbox.email.length > 0;
  return (
    <Card className="border border-[var(--rail)] p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{mailbox.email}</p>
          {mailbox.name && (
            <p className="text-[11px] text-[var(--text-dim)] mt-0.5">{mailbox.name}</p>
          )}
          <p className="text-[10px] text-[var(--text-dim)] font-mono mt-1">{truncate(mailbox.id, 14)}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
          isActive ? MAILBOX_TONE.ACTIVE : MAILBOX_TONE.SUSPENDED
        }`}>
          {isActive ? 'Active' : 'Suspended'}
        </span>
      </div>

      <p className="text-[10px] text-[var(--text-dim)] mt-2">Created {fmtDate(mailbox.createdAt)}</p>

      <div className="flex justify-end mt-3">
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
    </Card>
  );
}
