'use client';

import { useState } from 'react';
import type { EmailAlias, FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button, Card, EmptyState, Input, Modal } from '@fidscript/ui';

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
  const [newAliasLocal, setNewAliasLocal] = useState('');
  const [newAliasForward, setNewAliasForward] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newAliasLocal.trim() || !newAliasForward.trim()) return;
    if (!projectId) {
      setCreateError('Missing project context — cannot create alias');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const pid = projectId;
      const forwards = newAliasForward.split(',').map(s => s.trim()).filter(Boolean);
      const targets = forwards.map(forward => {
        const mb = mailboxes.find(m => m.email.toLowerCase() === forward.toLowerCase());
        if (mb) return { type: 'mailbox' as const, mailboxId: mb.id };
        return { type: 'external' as const, address: forward };
      });
      const created = await sdk.email.createAlias(pid, {
        domain: domainName,
        localPart: newAliasLocal.trim(),
        targets,
      });
      onCreate(created);
      setNewAliasLocal('');
      setNewAliasForward('');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create alias');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Aliases</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Alias
        </Button>
      </div>

      {aliases.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No aliases"
            description="Create an alias to forward email to mailboxes."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                Create Alias
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="border border-[var(--rail)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Alias</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Forwards To</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Created</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map(alias => (
                <tr key={alias.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">{alias.alias}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{alias.forwardsTo.join(', ')}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {new Date(alias.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(alias.id)}
                      className="text-xs text-[var(--danger)] hover:text-[var(--danger)] bg-none border-none cursor-pointer p-0"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(null); setNewAliasLocal(''); setNewAliasForward(''); }}
        title="Create Alias"
      >
        <form onSubmit={handleCreate} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              Alias local part <span className="text-[var(--text-dim)]">@{domainName}</span>
            </label>
            <Input
              value={newAliasLocal}
              onChange={e => setNewAliasLocal(e.target.value)}
              placeholder="support"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              Forwards to <span className="text-[var(--text-dim)]">(comma-separated emails)</span>
            </label>
            <Input
              value={newAliasForward}
              onChange={e => setNewAliasForward(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          {createError && <p className="text-[var(--danger)] text-xs mb-4">{createError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={creating}>
              {creating ? 'Creating...' : 'Create Alias'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
