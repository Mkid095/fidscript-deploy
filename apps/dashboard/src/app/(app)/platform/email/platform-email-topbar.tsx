'use client';

import { Button } from '@fidscript/ui';
import type { PlatformMailboxSummary } from '@fidscript-deploy/sdk';

interface PlatformEmailTopbarProps {
  mailboxes: PlatformMailboxSummary[];
  onCompose: () => void;
  onNewMailbox: () => void;
}

export function PlatformEmailTopbar({ mailboxes, onCompose, onNewMailbox }: PlatformEmailTopbarProps) {
  const domain = mailboxes[0]?.email?.split('@')[1] ?? 'platform';
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-1">Platform Mailboxes</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {mailboxes.length} mailbox{mailboxes.length !== 1 ? 'es' : ''} on {domain}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCompose}>Compose</Button>
        <Button variant="primary" size="sm" onClick={onNewMailbox}>New Mailbox</Button>
      </div>
    </div>
  );
}
