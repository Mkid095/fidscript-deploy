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
  PENDING: 'bg-slate-700 text-slate-300',
  VERIFIED: 'bg-blue-900 text-blue-400',
  ACTIVE: 'bg-emerald-900 text-emerald-400',
  FAILED: 'bg-red-900 text-red-400',
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
      <div className="text-red-400 text-sm">{error ?? 'Domain not found'}</div>
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
        <Link href="/email" className="text-slate-500 hover:text-slate-300 text-sm no-underline">
          Email
        </Link>
        <span className="text-slate-600">/</span>
        <h1 className="text-xl font-bold text-slate-200">{domain.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[domain.status ?? 'UNKNOWN'] ?? 'bg-slate-700 text-slate-300'}`}>
          {domain.status ?? 'UNKNOWN'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e2130] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors duration-150 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-500 text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            } bg-none border-none cursor-pointer`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Domain Info */}
          <Card className="border border-[#1e2130]" padding="lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Domain Information</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-4">
                <dt className="text-slate-500 w-32 flex-shrink-0">Domain ID</dt>
                <dd className="text-slate-300 font-mono text-xs">{domain.id}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-slate-500 w-32 flex-shrink-0">DNS Status</dt>
                <dd className="text-slate-300">{domain.dnsStatus ?? 'UNKNOWN'}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-slate-500 w-32 flex-shrink-0">SSL Status</dt>
                <dd className="text-slate-300">{domain.sslStatus ?? 'UNKNOWN'}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-slate-500 w-32 flex-shrink-0">Created</dt>
                <dd className="text-slate-300">{new Date(domain.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>

          {/* DNS Records */}
          <Card className="border border-[#1e2130]" padding="lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">DNS Configuration</h2>
            <p className="text-xs text-slate-500 mb-4">
              Add the following DNS records to verify ownership and receive email.
            </p>
            <div className="space-y-3">
              <div className="rounded border border-[#1e2130] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">TXT Verification</span>
                  <span className="text-xs text-slate-500">Required</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-slate-400">Name: <span className="text-slate-200">@</span></p>
                  <p className="text-slate-400">Type: <span className="text-slate-200">TXT</span></p>
                  <p className="text-slate-400">Value: <span className="text-slate-200 break-all">fidscript-verification={domain.id.slice(0, 16)}</span></p>
                </div>
              </div>
              <div className="rounded border border-[#1e2130] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">MX Record</span>
                  <span className="text-xs text-slate-500">Required</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-slate-400">Name: <span className="text-slate-200">@</span></p>
                  <p className="text-slate-400">Type: <span className="text-slate-200">MX</span></p>
                  <p className="text-slate-400">Priority: <span className="text-slate-200">10</span></p>
                  <p className="text-slate-400">Value: <span className="text-slate-200">mail.{domain.name}</span></p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'mailboxes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Mailboxes</h2>
            <Button variant="primary" size="sm" onClick={() => setShowCreateMailbox(true)}>
              Create Mailbox
            </Button>
          </div>

          {mailboxes.length === 0 ? (
            <Card className="border border-[#1e2130]">
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
            <Card className="border border-[#1e2130] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2130]">
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Email</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Name</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Created</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mailboxes.map(mb => (
                    <tr key={mb.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                      <td className="px-4 py-3">
                        <Link href={`/email/${domainId}/mailboxes/${mb.id}`} className="text-slate-200 hover:text-blue-400 no-underline font-mono text-xs">
                          {mb.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{mb.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(mb.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteMailbox(mb.id)}
                          className="text-xs text-red-400 hover:text-red-300 bg-none border-none cursor-pointer p-0"
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
            <h2 className="text-sm font-semibold text-slate-200">Aliases</h2>
            <Button variant="primary" size="sm" onClick={() => setShowCreateAlias(true)}>
              Create Alias
            </Button>
          </div>

          {aliases.length === 0 ? (
            <Card className="border border-[#1e2130]">
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
            <Card className="border border-[#1e2130] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2130]">
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Alias</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Forwards To</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Created</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.map(alias => (
                    <tr key={alias.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-200">{alias.alias}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{alias.forwardsTo.join(', ')}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(alias.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteAlias(alias.id)}
                          className="text-xs text-red-400 hover:text-red-300 bg-none border-none cursor-pointer p-0"
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
        <Card className="border border-[#1e2130]" padding="lg">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Catch-all Rule</h2>
          <p className="text-sm text-slate-500 mb-4">
            Catch-all redirects any email sent to unconfigured addresses on this domain.
            Configure this in your DNS or domain settings.
          </p>
          <div className="rounded border border-[#1e2130] p-4 bg-[#080a0d]">
            <p className="text-xs text-slate-500">
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
            <label className="block text-xs text-slate-400 mb-1">Email address</label>
            <Input
              value={newMailboxEmail}
              onChange={e => setNewMailboxEmail(e.target.value)}
              placeholder="alice@example.com"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Display name (optional)</label>
            <Input
              value={newMailboxName}
              onChange={e => setNewMailboxName(e.target.value)}
              placeholder="Alice Smith"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          {createError && <p className="text-red-400 text-xs mb-4">{createError}</p>}
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
            <label className="block text-xs text-slate-400 mb-1">Alias address</label>
            <Input
              value={newAliasAddress}
              onChange={e => setNewAliasAddress(e.target.value)}
              placeholder="support@example.com"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Forwards to (comma-separated emails)</label>
            <Input
              value={newAliasForward}
              onChange={e => setNewAliasForward(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          {createError && <p className="text-red-400 text-xs mb-4">{createError}</p>}
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
