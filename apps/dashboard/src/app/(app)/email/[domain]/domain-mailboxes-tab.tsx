'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button, Card, EmptyState, Input, Modal } from '@fidscript/ui';

function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
}

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
  const [newMailboxLocal, setNewMailboxLocal] = useState('');
  const [newMailboxName, setNewMailboxName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newMailboxLocal.trim()) return;
    if (!projectId) {
      setCreateError('Missing project context — cannot create mailbox');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const pid = projectId;
      const created = await sdk.email.createMailbox(pid, {
        domain: domainName,
        localPart: newMailboxLocal.trim(),
        password: randomPassword(),
        name: newMailboxName.trim() || undefined,
      });
      onCreate(created);
      setNewMailboxLocal('');
      setNewMailboxName('');
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create mailbox');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Mailboxes</h2>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          Create Mailbox
        </Button>
      </div>

      {mailboxes.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No mailboxes"
            description="Create a mailbox to start receiving email."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                Create Mailbox
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="border border-[var(--rail)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Email</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Created</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mailboxes.map(mb => (
                <tr key={mb.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/email/${domainId}/mailboxes/${mb.id}`}
                      className="text-[var(--text)] hover:text-[var(--accent)] no-underline font-mono text-xs"
                    >
                      {mb.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{mb.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {new Date(mb.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(mb.id)}
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
        onClose={() => { setShowCreate(false); setCreateError(null); setNewMailboxLocal(''); setNewMailboxName(''); }}
        title="Create Mailbox"
      >
        <form onSubmit={handleCreate} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              Local part <span className="text-[var(--text-dim)]">@{domainName}</span>
            </label>
            <Input
              value={newMailboxLocal}
              onChange={e => setNewMailboxLocal(e.target.value)}
              placeholder="alice"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Display name (optional)</label>
            <Input
              value={newMailboxName}
              onChange={e => setNewMailboxName(e.target.value)}
              placeholder="Alice Smith"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          {createError && <p className="text-[var(--danger)] text-xs mb-4">{createError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreate(false); setCreateError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
