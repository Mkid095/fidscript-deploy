'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { EmailDomain, Mailbox, EmailAlias } from '@fidscript-deploy/sdk';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { DomainHeader } from './domain-header';
import { DomainTabs } from './domain-tabs';
import { DomainOverviewTab } from './domain-overview-tab';
import { DomainMailboxesTab } from './domain-mailboxes-tab';
import { DomainAliasesTab } from './domain-aliases-tab';
import { DomainCatchallTab } from './domain-catchall-tab';

type Tab = 'overview' | 'mailboxes' | 'aliases' | 'catchall';

type CatchAllRule = {
  id: string;
  target: { type: 'mailbox'; mailboxId: string } | { type: 'external'; address: string };
  isActive: boolean;
};

export default function DomainPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const domainId = params.domain as string;
  const projectId = useShellProjectId();

  const [domain, setDomain] = useState<(EmailDomain & Record<string, unknown>) | null>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [catchAllRule, setCatchAllRule] = useState<CatchAllRule | null>(null);

  useEffect(() => {
    if (!projectId) return;
    async function loadDomain() {
      try {
        const sdk = getSdk();
        const data = await sdk.email.getDomain(projectId ?? '', domainId);
        setDomain(data as (EmailDomain & Record<string, unknown>));
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
        const domainName = domain.domain ?? domain.name ?? '';
        const [mbList, aliasList, catchAll] = await Promise.all([
          sdk.email.listMailboxes(pid),
          sdk.email.listAliases(pid),
          sdk.email.getCatchAll(pid, domainId).catch(() => null),
        ]);
        setMailboxes((mbList ?? []).filter((m: Mailbox) => m.email.endsWith(`@${domainName}`)));
        setAliases((aliasList ?? []).filter((a: EmailAlias) => a.alias.endsWith(`@${domainName}`)));
        setCatchAllRule(catchAll as CatchAllRule | null);
      } catch {
        // ignore load errors silently
      }
    }
    loadDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, domainId, getSdk, domain]);

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

  const domainName = domain.domain ?? domain.name ?? '';

  return (
    <div>
      <DomainHeader domain={domain} domainId={domainId} />

      <DomainTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mailboxCount={mailboxes.length}
        aliasCount={aliases.length}
      />

      {activeTab === 'overview' && (
        <DomainOverviewTab domain={domain} />
      )}

      {activeTab === 'mailboxes' && (
        <DomainMailboxesTab
          domainId={domainId}
          domainName={domainName}
          projectId={projectId ?? ''}
          mailboxes={mailboxes}
          onCreate={setMailboxes}
          onDelete={id => setMailboxes(prev => prev.filter(m => m.id !== id))}
          getSdk={getSdk}
        />
      )}

      {activeTab === 'aliases' && (
        <DomainAliasesTab
          domainId={domainId}
          domainName={domainName}
          projectId={projectId ?? ''}
          aliases={aliases}
          mailboxes={mailboxes}
          onCreate={setAliases}
          onDelete={id => setAliases(prev => prev.filter(a => a.id !== id))}
          getSdk={getSdk}
        />
      )}

      {activeTab === 'catchall' && (
        <DomainCatchallTab
          domainId={domainId}
          domainName={domainName}
          projectId={projectId ?? ''}
          status={domain.status ?? 'UNKNOWN'}
          catchAllRule={catchAllRule}
          mailboxes={mailboxes}
          onSave={setCatchAllRule}
          onDelete={() => setCatchAllRule(null)}
          getSdk={getSdk}
        />
      )}
    </div>
  );
}
