'use client';

import { Card, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon } from '@hugeicons/core-free-icons';

type Folder = 'inbox' | 'sent' | 'trash';

interface MailboxEmptyStateProps {
  folder: Folder;
  search: string;
  onCompose: () => void;
}

export function MailboxEmptyState({ folder, search, onCompose }: MailboxEmptyStateProps) {
  const titles: Record<Folder, string> = {
    inbox: 'Inbox is empty',
    sent: 'Nothing sent yet',
    trash: 'Trash is empty',
  };
  const descriptions: Record<Folder, string> = {
    inbox: 'Inbound mail will appear here.',
    sent: 'Mail you send from this mailbox will appear here.',
    trash: 'Deleted messages will appear here.',
  };

  return (
    <Card className="border border-[var(--rail)]">
      <EmptyState
        title={search ? 'No matches' : titles[folder]}
        description={search ? 'Try a different search term.' : descriptions[folder]}
        action={folder === 'inbox' || folder === 'sent' ? (
          <button
            onClick={onCompose}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors"
          >
            <HugeiconsIcon icon={Mail01Icon} size={14} />
            Compose
          </button>
        ) : undefined}
      />
    </Card>
  );
}
