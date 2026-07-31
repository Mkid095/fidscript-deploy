'use client';

import { useState } from 'react';
import type { Mailbox } from '@fidscript-deploy/sdk';
import { Button, Card } from '@fidscript/ui';
import { CatchAllConfigModal } from './domain-catchall-config-modal';

type CatchAllTarget =
  | { type: 'mailbox'; mailboxId: string }
  | { type: 'external'; address: string }
  | { type: 'webhook'; url: string };

interface CatchAllRule {
  id: string;
  target: CatchAllTarget;
  isActive: boolean;
}

interface Props {
  domainId: string;
  domainName: string;
  projectId: string;
  status: string;
  catchAllRule: CatchAllRule | null;
  mailboxes: Mailbox[];
  onSave: (rule: CatchAllRule | null) => void;
  getSdk: () => ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk'];
}

export function DomainCatchallTab({ domainId, domainName, status, catchAllRule, mailboxes, onSave, getSdk }: Props) {
  const [showConfig, setShowConfig] = useState(false);

  async function handleDelete() {
    const sdk = getSdk();
    await sdk.email.deleteCatchAll(projectId, domainId);
    onSave(null);
  }

  return (
    <>
      {status !== 'ACTIVE' && (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-xs text-[var(--warning)] mb-4">
          Domain must be Active before configuring catch-all. Verify DNS first.
        </div>
      )}

      {catchAllRule ? (
        <Card className="border border-[var(--rail)]" padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Catch-all Rule</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Unmatched addresses on <span className="font-mono text-[var(--text)]">{domainName}</span> are delivered to:
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-emerald-900/30 text-[var(--success)] border border-[var(--success)]/30 font-medium">
                  {catchAllRule.target.type === 'mailbox' ? 'Mailbox' : catchAllRule.target.type === 'external' ? 'External' : 'Webhook'}
                </span>
                <span className="text-sm text-[var(--text)] font-mono">
                  {catchAllRule.target.type === 'mailbox'
                    ? mailboxes.find(m => m.id === catchAllRule.target.mailboxId)?.email ?? catchAllRule.target.mailboxId
                    : String((catchAllRule.target as { address?: string }).address ?? '')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowConfig(true)}>Edit</Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>Remove</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border border-[var(--rail)]" padding="lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Catch-all Rule</h2>
              <p className="text-xs text-[var(--text-muted)]">
                No catch-all configured. Any email sent to unconfigured addresses on this domain will be rejected.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowConfig(true)}
              disabled={status !== 'ACTIVE'}
            >
              Configure Catch-all
            </Button>
          </div>
        </Card>
      )}

      <CatchAllConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        domainId={domainId}
        projectId={projectId}
        initialRule={catchAllRule}
        mailboxes={mailboxes}
        onSave={() => {
          // Reload catchall state from parent
          const sdk = getSdk();
          sdk.email.getCatchAll(projectId, domainId).then(r => onSave(r as CatchAllRule)).catch(() => {});
        }}
        getSdk={getSdk}
      />
    </>
  );
}
