'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';

// Local type definitions mirroring SDK internal modules
interface Domain {
  id: string;
  name: string;
  projectId?: string;
  dnsStatus: string;
  sslStatus: string;
  status?: string;
  ownerId: string;
  createdAt: string;
}
interface Mailbox {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}
interface EmailAlias {
  id: string;
  alias: string;
  forwardsTo: string[];
  createdAt: string;
}

type Tab = 'overview' | 'mailboxes' | 'aliases' | 'catchall';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[var(--rail)] text-[var(--text-muted)]',
  VERIFIED: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE: 'bg-emerald-900 text-[var(--success)]',
  FAILED: 'bg-red-900 text-[var(--danger)]',
};

export default function DomainPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const domainId = params.domain as string;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showCreateMailbox, setShowCreateMailbox] = useState(false);
  const [showCreateAlias, setShowCreateAlias] = useState(false);
  const [newMailboxEmail, setNewMailboxEmail] = useState('');
  const [newMailboxName, setNewMailboxName] = useState('');
  const [newAliasAddress, setNewAliasAddress] = useState('');
  const [newAliasForward, setNewAliasForward] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const sdk = getSdk();
        const [domainData, mailboxesData, aliasesData] = await Promise.all([
          sdk.domains.get(domainId),
          sdk.email.listMailboxes(domainId),
          sdk.email.listAliases(domainId),
        ]);
        setDomain(domainData);
        setMailboxes(mailboxesData);
        setAliases(aliasesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load domain');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [domainId, getSdk]);

  async function handleCreateMailbox(e: React.FormEvent) {
    e.preventDefault();
    if (!newMailboxEmail.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.email.createMailbox(domainId, newMailboxEmail.trim(), newMailboxName.trim() || undefined);
      setMailboxes(prev => [...prev, created]);
      setNewMailboxEmail('');
      setNewMailboxName('');
      setShowCreateMailbox(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create mailbox');
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!newAliasAddress.trim() || !newAliasForward.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const forwards = newAliasForward.split(',').map(s => s.trim()).filter(Boolean);
      const created = await sdk.email.createAlias(domainId, newAliasAddress.trim(), forwards);
      setAliases(prev => [...prev, created]);
      setNewAliasAddress('');
      setNewAliasForward('');
      setShowCreateAlias(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create alias');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteMailbox(id: string) {
    try {
      const sdk = getSdk();
      await sdk.email.deleteMailbox(domainId, id);
      setMailboxes(prev => prev.filter(m => m.id !== id));
    } catch {
      // ignore delete errors silently
    }
  }

  async function handleDeleteAlias(id: string) {
    try {
      const sdk = getSdk();
      await sdk.email.deleteAlias(domainId, id);
      setAliases(prev => prev.filter(a => a.id !== id));
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="text-[var(--danger)] text-sm">{error ?? 'Domain not found'}</div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'mailboxes', label: `Mailboxes (${mailboxes.length})` },
    { id: 'aliases', label: `Aliases (${aliases.length})` },
    { id: 'catchall', label: 'Catch-all' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/email" className="text-[var(--text-muted)] hover:text-[var(--text-muted)] text-sm no-underline">
          Email
        </Link>
        <span className="text-[var(--text-dim)]">/</span>
        <h1 className="text-xl font-bold text-[var(--text)]">{domain.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[domain.status ?? 'UNKNOWN'] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
          {domain.status ?? 'UNKNOWN'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--rail)] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors duration-150 -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
            } bg-none border-none cursor-pointer`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Domain Info */}
          <Card className="border border-[var(--rail)]" padding="lg">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Domain Information</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-4">
                <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">Domain ID</dt>
                <dd className="text-[var(--text-muted)] font-mono text-xs">{domain.id}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">DNS Status</dt>
                <dd className="text-[var(--text-muted)]">{domain.dnsStatus ?? 'UNKNOWN'}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">SSL Status</dt>
                <dd className="text-[var(--text-muted)]">{domain.sslStatus ?? 'UNKNOWN'}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">Created</dt>
                <dd className="text-[var(--text-muted)]">{new Date(domain.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>

          {/* DNS Records */}
          <Card className="border border-[var(--rail)]" padding="lg">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4">DNS Configuration</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Add the following DNS records to verify ownership and receive email.
            </p>
            <div className="space-y-3">
              <div className="rounded border border-[var(--rail)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">TXT Verification</span>
                  <span className="text-xs text-[var(--text-muted)]">Required</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">@</span></p>
                  <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
                  <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)] break-all">fidscript-verification={domain.id.slice(0, 16)}</span></p>
                </div>
              </div>
              <div className="rounded border border-[var(--rail)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">MX Record</span>
                  <span className="text-xs text-[var(--text-muted)]">Required</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">@</span></p>
                  <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">MX</span></p>
                  <p className="text-[var(--text-muted)]">Priority: <span className="text-[var(--text)]">10</span></p>
                  <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)]">mail.{domain.name}</span></p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'mailboxes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Mailboxes</h2>
            <Button variant="primary" size="sm" onClick={() => setShowCreateMailbox(true)}>
              Create Mailbox
            </Button>
          </div>

          {mailboxes.length === 0 ? (
            <Card className="border border-[var(--rail)]">
              <EmptyState
                title="No mailboxes"
                description="Create a mailbox to start receiving email."
                action={
                  <Button variant="primary" size="sm" onClick={() => setShowCreateMailbox(true)}>
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
                        <Link href={`/email/${domainId}/mailboxes/${mb.id}`} className="text-[var(--text)] hover:text-[var(--accent)] no-underline font-mono text-xs">
                          {mb.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{mb.name ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                        {new Date(mb.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteMailbox(mb.id)}
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
        </div>
      )}

      {activeTab === 'aliases' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">Aliases</h2>
            <Button variant="primary" size="sm" onClick={() => setShowCreateAlias(true)}>
              Create Alias
            </Button>
          </div>

          {aliases.length === 0 ? (
            <Card className="border border-[var(--rail)]">
              <EmptyState
                title="No aliases"
                description="Create an alias to forward email to mailboxes."
                action={
                  <Button variant="primary" size="sm" onClick={() => setShowCreateAlias(true)}>
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
                          onClick={() => handleDeleteAlias(alias.id)}
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
        </div>
      )}

      {activeTab === 'catchall' && (
        <Card className="border border-[var(--rail)]" padding="lg">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Catch-all Rule</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Catch-all redirects any email sent to unconfigured addresses on this domain.
            Configure this in your DNS or domain settings.
          </p>
          <div className="rounded border border-[var(--rail)] p-4 bg-[var(--surface-2)]">
            <p className="text-xs text-[var(--text-muted)]">
              Catch-all is not yet configured for this domain. Add a catch-all mailbox alias to capture all unmatched emails.
            </p>
          </div>
        </Card>
      )}

      {/* Create Mailbox Modal */}
      <Modal
        isOpen={showCreateMailbox}
        onClose={() => { setShowCreateMailbox(false); setCreateError(null); setNewMailboxEmail(''); setNewMailboxName(''); }}
        title="Create Mailbox"
      >
        <form onSubmit={handleCreateMailbox} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Email address</label>
            <Input
              value={newMailboxEmail}
              onChange={e => setNewMailboxEmail(e.target.value)}
              placeholder="alice@example.com"
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
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreateMailbox(false); setCreateError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Alias Modal */}
      <Modal
        isOpen={showCreateAlias}
        onClose={() => { setShowCreateAlias(false); setCreateError(null); setNewAliasAddress(''); setNewAliasForward(''); }}
        title="Create Alias"
      >
        <form onSubmit={handleCreateAlias} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Alias address</label>
            <Input
              value={newAliasAddress}
              onChange={e => setNewAliasAddress(e.target.value)}
              placeholder="support@example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Forwards to (comma-separated emails)</label>
            <Input
              value={newAliasForward}
              onChange={e => setNewAliasForward(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          {createError && <p className="text-[var(--danger)] text-xs mb-4">{createError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCreateAlias(false); setCreateError(null); }}>
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
