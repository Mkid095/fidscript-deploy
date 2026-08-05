'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@fidscript/ui';

import OverviewTab from './overview-tab';
import DnsTab from './dns-tab';
import HealthTab from './health-tab';
import EmailTab from './email-tab';
import SslTab from './ssl-tab';
import WizardTab from './wizard-tab';
import RepairsTab from './repairs-tab';

type Tab = 'overview' | 'dns' | 'health' | 'email' | 'ssl' | 'wizard' | 'repairs';

export default function DomainDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const domainId = params.domainId as string;
  const [activeTab, setActiveTab] = useState<Tab>('dns');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'dns', label: 'DNS Records' },
    { id: 'wizard', label: '🔮 Setup Wizard' },
    { id: 'health', label: 'Health' },
    { id: 'email', label: 'Email' },
    { id: 'ssl', label: 'SSL' },
    { id: 'repairs', label: '🔧 Repairs' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* ── Back link ────────────────────────────────────────────────────── */}
      <Link
        href={`/projects/${projectId}/domains`}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Domains
      </Link>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[var(--rail)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
            } bg-none border-none cursor-pointer`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && <OverviewTab projectId={projectId} domainId={domainId} />}
      {activeTab === 'dns' && <DnsTab projectId={projectId} domainId={domainId} />}
      {activeTab === 'health' && <HealthTab projectId={projectId} domainId={domainId} />}
      {activeTab === 'email' && <EmailTab projectId={projectId} domainId={domainId} />}
      {activeTab === 'ssl' && <SslTab projectId={projectId} domainId={domainId} />}
      {activeTab === 'wizard' && <WizardTab projectId={projectId} domainId={domainId} />}
      {activeTab === 'repairs' && <RepairsTab projectId={projectId} domainId={domainId} />}
    </div>
  );
}
