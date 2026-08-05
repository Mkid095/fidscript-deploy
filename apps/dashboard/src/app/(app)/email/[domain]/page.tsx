'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { EmailDomain } from '@fidscript-deploy/sdk';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { DomainHeader } from './domain-header';
import { DomainTabs } from './domain-tabs';
import { DomainOverviewTab } from './domain-overview-tab';
import { DomainMailboxesTab } from './domain-mailboxes-tab';
import { DomainAliasesTab } from './domain-aliases-tab';
import { DomainCatchallTab } from './domain-catchall-tab';
import { useDomainData, useCatchAllRule } from './domain-page-hooks';

type Tab = 'overview' | 'mailboxes' | 'aliases' | 'catchall';

type CatchAllRule = {
  id: string;
  target: { type: 'mailbox'; mailboxId: string } | { type: 'external'; address: string } | { type: 'webhook'; url: string };
  isActive: boolean;
};

export default function DomainPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const domainId = params.domain as string;
  const projectId = useShellProjectId();

  const { data, loading, error, reload } = useDomainData(domainId);
  const { rule: catchAllRule } = useCatchAllRule(projectId ?? '', domainId);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const domain = data?.domain ?? null;
  const mailboxes = data?.mailboxes ?? [];
  const aliases = data?.aliases ?? [];

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
          onDelete={reload}
          getSdk={getSdk}
          reload={reload}
        />
      )}

      {activeTab === 'aliases' && (
        <DomainAliasesTab
          domainId={domainId}
          domainName={domainName}
          projectId={projectId ?? ''}
          aliases={aliases}
          mailboxes={mailboxes}
          onDelete={reload}
          getSdk={getSdk}
          reload={reload}
        />
      )}

      {activeTab === 'catchall' && (
        <DomainCatchallTab
          domainId={domainId}
          domainName={domainName}
          projectId={projectId ?? ''}
          status={domain.status ?? 'UNKNOWN'}
          catchAllRule={catchAllRule as CatchAllRule | null}
          mailboxes={mailboxes}
          onSave={reload}
          getSdk={getSdk}
        />
      )}
    </div>
  );
}
