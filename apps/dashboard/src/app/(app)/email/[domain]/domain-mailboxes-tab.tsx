'use client';

import { useState } from 'react';
import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button } from '@fidscript/ui';
import { MailboxList } from './mailbox-list';
import { MailboxCreateModal } from './mailbox-create-modal';

interface Props {
  domainId: string;
  domainName: string;
  projectId: string | undefined;
  mailboxes: Mailbox[];
  onCreate: (mailbox: Mailbox) => void;
  onDelete: (id: string) => void;
  getSdk: () => FidscriptSDK;
}

export function DomainMailboxesTab({ domainId, domainName, projectId, mailboxes, onCreate, onDelete, getSdk }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Mailboxes</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Mailbox
        </Button>
      </div>

      <MailboxList domainId={domainId} mailboxes={mailboxes} onDelete={onDelete} />

      <MailboxCreateModal
        isOpen={showCreate}
        domainName={domainName}
        projectId={projectId}
        getSdk={getSdk}
        onClose={() => setShowCreate(false)}
        onCreated={onCreate}
      />
    </div>
  );
}
