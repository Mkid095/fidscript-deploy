'use client';
// eslint-disable-next-line import/order
import type { EmailDomain, Mailbox, EmailAlias } from '@fidscript/sdk';

import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

type Tab = 'overview' | 'mailboxes' | 'aliases' | 'catchall';

type CatchAllTarget =
  | { type: 'mailbox'; mailboxId: string }
  | { type: 'external'; address: string }
  | { type: 'webhook'; url: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[var(--rail)] text-[var(--text-muted)]',
  VERIFIED: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE: 'bg-emerald-900 text-[var(--success)]',
  FAILED: 'bg-red-900 text-[var(--danger)]',
};

function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
}

export default function DomainPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const domainId = params.domain as string;
  const projectId = useShellProjectId();

  const [domain, setDomain] = useState<EmailDomain | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showCreateMailbox, setShowCreateMailbox] = useState(false);
  const [showCreateAlias, setShowCreateAlias] = useState(false);
  const [newMailboxLocal, setNewMailboxLocal] = useState('');
  const [newMailboxName, setNewMailboxName] = useState('');
  const [newAliasLocal, setNewAliasLocal] = useState('');
  const [newAliasForward, setNewAliasForward] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showCatchAllConfig, setShowCatchAllConfig] = useState(false);
  const [catchAllRule, setCatchAllRule] = useState<{ id: string; target: CatchAllTarget; isActive: boolean } | null>(null);
  const [settingCatchAll, setSettingCatchAll] = useState(false);
  const [catchAllError, setCatchAllError] = useState<string | null>(null);
  const [catchAllTargetType, setCatchAllTargetType] = useState<'mailbox' | 'external'>('mailbox');
  const [catchAllMailboxId, setCatchAllMailboxId] = useState('');
  const [catchAllExternal, setCatchAllExternal] = useState('');

  // Separate effect to load initial domain data first
  useEffect(() => {
    if (!projectId) return;
    async function loadDomain() {
      try {
        const sdk = getSdk();
        const domainData = await sdk.email.getDomain(projectId ?? '', domainId);
        setDomain(domainData as any);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load domain');
      } finally {
        setLoading(false);
      }
    }
    loadDomain();
  }, [projectId, domainId, getSdk]);

  useEffect(() => {
    if (!projectId || !domain) return;
    async function loadDetails() {
      try {
        const sdk = getSdk();
        const pid = projectId ?? '';
        const [mbList, aliasList, catchAll] = await Promise.all([
          sdk.email.listMailboxes(pid),
          sdk.email.listAliases(pid),
          sdk.email.getCatchAll(pid, domainId).catch(() => null),
        ]);
        // Filter to this domain only
        const domainName = (domain as any).domain ?? (domain as any).name ?? '';
        setMailboxes((mbList ?? []).filter((m: Mailbox) => m.email.endsWith(`@${domainName}`)));
        setAliases((aliasList ?? []).filter((a: EmailAlias) => a.alias.endsWith(`@${domainName}`)));
        setCatchAllRule(catchAll as any);
      } catch {
        // ignore load errors silently
      }
    }
    loadDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, domainId, getSdk, domain]);

  async function handleCreateMailbox(e: React.FormEvent) {
    e.preventDefault();
    if (!newMailboxLocal.trim() || !domain) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.email.createMailbox(projectId ?? '', {
        domain: domain.domain,
        localPart: newMailboxLocal.trim(),
        password: randomPassword(),
        name: newMailboxName.trim() || undefined,
      } as any);
      setMailboxes(prev => [...prev, created as Mailbox]);
      setNewMailboxLocal('');
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
    if (!newAliasLocal.trim() || !newAliasForward.trim() || !domain) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      const forwards = newAliasForward.split(',').map(s => s.trim()).filter(Boolean);
      // Resolve each forward to a target
      const targets = forwards.map(forward => {
        const mb = mailboxes.find(m => m.email.toLowerCase() === forward.toLowerCase());
        if (mb) return { type: 'mailbox' as const, mailboxId: mb.id };
        return { type: 'external' as const, address: forward };
      });
      const created = await sdk.email.createAlias(projectId ?? '', {
        domain: domain.domain,
        localPart: newAliasLocal.trim(),
        targets,
      } as any);
      setAliases(prev => [...prev, created as EmailAlias]);
      setNewAliasLocal('');
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
      await sdk.email.deleteMailbox(projectId ?? '', id);
      setMailboxes(prev => prev.filter(m => m.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleDeleteAlias(id: string) {
    try {
      const sdk = getSdk();
      await sdk.email.deleteAlias(projectId ?? '', id);
      setAliases(prev => prev.filter(a => a.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleSaveCatchAll(e: React.FormEvent) {
    e.preventDefault();
    if (catchAllTargetType === 'mailbox' && !catchAllMailboxId) return;
    if (catchAllTargetType === 'external' && !catchAllExternal.trim()) return;
    setSettingCatchAll(true);
    setCatchAllError(null);
    try {
      const sdk = getSdk();
      const target = catchAllTargetType === 'mailbox'
        ? { type: 'mailbox' as const, mailboxId: catchAllMailboxId }
        : { type: 'external' as const, address: catchAllExternal.trim() };
      await sdk.email.setCatchAll(projectId ?? '', domainId, target);
      const updated = await sdk.email.getCatchAll(projectId ?? '', domainId);
      setCatchAllRule(updated as any);
      setShowCatchAllConfig(false);
    } catch (err) {
      setCatchAllError(err instanceof Error ? err.message : 'Failed to save catch-all rule');
    } finally {
      setSettingCatchAll(false);
    }
  }

  async function handleDeleteCatchAll() {
    setSettingCatchAll(true);
    try {
      const sdk = getSdk();
      await sdk.email.deleteCatchAll(projectId ?? '', domainId);
      setCatchAllRule(null);
    } catch (err) {
      setCatchAllError(err instanceof Error ? err.message : 'Failed to delete catch-all rule');
    } finally {
      setSettingCatchAll(false);
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
        <h1 className="text-xl font-bold text-[var(--text)]">{(domain as any).domain ?? (domain as any).name ?? domainId}</h1>
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
                <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">Status</dt>
                <dd className="text-[var(--text-muted)] capitalize">{domain.status ?? 'UNKNOWN'}</dd>
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
              {/* MX Record */}
              <div className="rounded border border-[var(--rail)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">MX Record</span>
                  <span className="text-xs text-[var(--text-muted)]">Required</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">@</span></p>
                  <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">MX</span></p>
                  <p className="text-[var(--text-muted)]">Priority: <span className="text-[var(--text)]">10</span></p>
                  <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)]">mail.{(domain as any).domain ?? (domain as any).name ?? ''}</span></p>
                </div>
              </div>

              {/* TXT Verification */}
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

              {/* DKIM Record */}
              {(domain as any).dkimPublicKey && (
                <div className="rounded border border-[var(--rail)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">DKIM Record</span>
                    <span className="text-xs text-[var(--text-muted)]">Recommended</span>
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">{(domain as any).dkimSelector ?? 'mailchannels'}._domainkey.{(domain as any).domain ?? (domain as any).name ?? ''}</span></p>
                    <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
                    <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)] break-all">{(domain as any).dkimPublicKey}</span></p>
                  </div>
                </div>
              )}

              {/* SPF Record */}
              <div className="rounded border border-[var(--rail)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">SPF Record</span>
                  <span className="text-xs text-[var(--text-muted)]">Recommended</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">@</span></p>
                  <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
                  <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)]">v=spf1 include:_spf.{(domain as any).domain ?? (domain as any).name ?? ''} ~all</span></p>
                </div>
              </div>

              {/* DMARC Record */}
              <div className="rounded border border-[var(--rail)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">DMARC Record</span>
                  <span className="text-xs text-[var(--text-muted)]">Recommended</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">_dmarc.{(domain as any).domain ?? (domain as any).name ?? ''}</span></p>
                  <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
                  <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)]">v=DMARC1; p=quarantine; rua=mailto:dmarc@{(domain as any).domain ?? (domain as any).name ?? ''}</span></p>
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
        <>
          {domain.status !== 'ACTIVE' && (
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
                    Unmatched addresses on <span className="font-mono text-[var(--text)]">{(domain as any).domain ?? (domain as any).name ?? domainId}</span> are delivered to:
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-emerald-900/30 text-[var(--success)] border border-[var(--success)]/30 font-medium">
                      {(() => {
                        const t = catchAllRule.target;
                        return t.type === 'mailbox' ? '📥 Mailbox' : t.type === 'external' ? '📧 External' : '🔗 Webhook';
                      })()}
                    </span>
                    <span className="text-sm text-[var(--text)] font-mono">
                      {(() => {
                        const t = catchAllRule.target;
                        if (t.type === 'mailbox') {
                          return mailboxes.find(m => m.id === t.mailboxId)?.email ?? t.mailboxId;
                        }
                        return String((t as any).address ?? (t as any).url ?? '');
                      })()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => {
                    const t = catchAllRule!.target;
                    setCatchAllTargetType(t.type === 'webhook' ? 'external' : t.type);
                    if (t.type === 'mailbox') setCatchAllMailboxId(t.mailboxId);
                    else setCatchAllExternal((t as any).address ?? '');
                    setShowCatchAllConfig(true);
                  }}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleDeleteCatchAll} loading={settingCatchAll}>
                    Remove
                  </Button>
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
                  onClick={() => { setCatchAllTargetType('mailbox'); setCatchAllMailboxId(''); setCatchAllExternal(''); setShowCatchAllConfig(true); }}
                  disabled={domain.status !== 'ACTIVE'}
                >
                  Configure Catch-all
                </Button>
              </div>
            </Card>
          )}

          {catchAllError && (
            <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-xs text-[var(--danger)]">
              {catchAllError}
            </div>
          )}
        </>
      )}

      {/* Create Mailbox Modal */}
      <Modal
        isOpen={showCreateMailbox}
        onClose={() => { setShowCreateMailbox(false); setCreateError(null); setNewMailboxLocal(''); setNewMailboxName(''); }}
        title="Create Mailbox"
      >
        <form onSubmit={handleCreateMailbox} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Local part <span className="text-[var(--text-dim)]">@{(domain as any).domain ?? (domain as any).name ?? ''}</span></label>
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
        onClose={() => { setShowCreateAlias(false); setCreateError(null); setNewAliasLocal(''); setNewAliasForward(''); }}
        title="Create Alias"
      >
        <form onSubmit={handleCreateAlias} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Alias local part <span className="text-[var(--text-dim)]">@{(domain as any).domain ?? (domain as any).name ?? ''}</span></label>
            <Input
              value={newAliasLocal}
              onChange={e => setNewAliasLocal(e.target.value)}
              placeholder="support"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Forwards to <span className="text-[var(--text-dim)]">(comma-separated emails)</span></label>
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
              {creating ? 'Creating...' : 'Create Alias'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Catch-all Config Modal ─────────────────────────────── */}
      <Modal
        isOpen={showCatchAllConfig}
        onClose={() => { setShowCatchAllConfig(false); setCatchAllError(null); }}
        title={catchAllRule ? 'Edit Catch-all Rule' : 'Configure Catch-all Rule'}
      >
        <form onSubmit={handleSaveCatchAll} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Deliver to</label>
            <select
              value={catchAllTargetType}
              onChange={e => setCatchAllTargetType(e.target.value as 'mailbox' | 'external')}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="mailbox">Internal Mailbox</option>
              <option value="external">External Email Address</option>
            </select>
          </div>
          {catchAllTargetType === 'mailbox' ? (
            <div className="mb-4">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Mailbox</label>
              <select
                value={catchAllMailboxId}
                onChange={e => setCatchAllMailboxId(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="">Select mailbox...</option>
                {mailboxes.map(mb => (
                  <option key={mb.id} value={mb.id}>{mb.email}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-xs text-[var(--text-muted)] mb-1">External address</label>
              <Input
                value={catchAllExternal}
                onChange={e => setCatchAllExternal(e.target.value)}
                placeholder="recipient@example.com"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
              />
            </div>
          )}
          {catchAllError && <p className="text-[var(--danger)] text-xs mb-4">{catchAllError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCatchAllConfig(false); setCatchAllError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={settingCatchAll}>
              {settingCatchAll ? 'Saving...' : 'Save Rule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
