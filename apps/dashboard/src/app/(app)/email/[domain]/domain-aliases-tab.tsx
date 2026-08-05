'use client';

import { useState } from 'react';
import type { EmailAlias, FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button } from '@fidscript/ui';
import { AliasList } from './alias-list';
import { AliasCreateModal } from './alias-create-modal';

interface Props {
  domainId: string;
  domainName: string;
  projectId: string | undefined;
  aliases: EmailAlias[];
  mailboxes: Mailbox[];
  onCreate: (alias: EmailAlias) => void;
  onDelete: (id: string) => void;
  getSdk: () => FidscriptSDK;
}

export function DomainAliasesTab({ domainId, domainName, projectId, aliases, mailboxes, onCreate, onDelete, getSdk }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Aliases</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Alias
        </Button>
      </div>

      <AliasList aliases={aliases} onDelete={onDelete} />

      <AliasCreateModal
        isOpen={showCreate}
        domainName={domainName}
        projectId={projectId}
        mailboxes={mailboxes}
        getSdk={getSdk}
        onClose={() => setShowCreate(false)}
        onCreated={onCreate}
      />
    </div>
  );
}
