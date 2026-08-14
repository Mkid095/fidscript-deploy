'use client';

import { useCallback, useState } from 'react';
import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button } from '@fidscript/ui';
import { MailboxList } from './mailbox-list';
import { MailboxCreateModal } from './mailbox-create-modal';

interface Props {
  domainId: string;
  domainName: string;
  projectId: string | undefined;
  mailboxes: Mailbox[];
  getSdk: () => FidscriptSDK;
  reload: () => void;
}

export function DomainMailboxesTab({ domainId, domainName, projectId, mailboxes, getSdk, reload }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = useCallback(async (mailboxId: string) => {
    if (!projectId) return;
    if (!confirm('Delete this mailbox? This cannot be undone.')) return;
    try {
      await getSdk().email.deleteMailbox(projectId, mailboxId);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete mailbox');
    }
  }, [projectId, getSdk, reload]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Mailboxes</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Mailbox
        </Button>
      </div>

      <MailboxList domainId={domainId} mailboxes={mailboxes} onDelete={handleDelete} />

      <MailboxCreateModal
        isOpen={showCreate}
        domainName={domainName}
        projectId={projectId}
        getSdk={getSdk}
        onClose={() => setShowCreate(false)}
        onCreated={reload}
      />
    </div>
  );
}
