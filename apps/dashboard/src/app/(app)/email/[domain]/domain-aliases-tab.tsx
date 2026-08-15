'use client';

import { useCallback, useState } from 'react';
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
  getSdk: () => FidscriptSDK;
  reload: () => void;
}

export function DomainAliasesTab({ domainId, domainName, projectId, aliases, mailboxes, getSdk, reload }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = useCallback(async (aliasId: string) => {
    if (!projectId) return;
    if (!confirm('Delete this alias? This cannot be undone.')) return;
    try {
      await getSdk().email.deleteAlias(projectId, aliasId);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete alias');
    }
  }, [projectId, getSdk, reload]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Aliases</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Alias
        </Button>
      </div>

      <AliasList aliases={aliases} onDelete={handleDelete} />

      <AliasCreateModal
        isOpen={showCreate}
        domainName={domainName}
        projectId={projectId}
        mailboxes={mailboxes}
        getSdk={getSdk}
        onClose={() => setShowCreate(false)}
        onCreated={reload}
      />
    </div>
  );
}
