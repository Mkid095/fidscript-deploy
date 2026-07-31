'use client';

import Link from 'next/link';
import type { EmailDomain } from '@fidscript-deploy/sdk';

type Tab = 'overview' | 'mailboxes' | 'aliases' | 'catchall';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-[var(--rail)] text-[var(--text-muted)]',
  VERIFIED: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE: 'bg-emerald-900 text-[var(--success)]',
  FAILED: 'bg-red-900 text-[var(--danger)]',
};

interface DomainPageHeaderProps {
  domain: EmailDomain & Record<string, unknown>;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  mailboxCount: number;
  aliasCount: number;
}

export function DomainPageHeader({ domain, activeTab, onTabChange, mailboxCount, aliasCount }: DomainPageHeaderProps) {
  const domainName = (domain.domain ?? domain.name ?? '') as string;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'mailboxes', label: `Mailboxes (${mailboxCount})` },
    { id: 'aliases', label: `Aliases (${aliasCount})` },
    { id: 'catchall', label: 'Catch-all' },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/email" className="text-[var(--text-muted)] hover:text-[var(--text-muted)] text-sm no-underline">Email</Link>
        <span className="text-[var(--text-dim)]">/</span>
        <h1 className="text-xl font-bold text-[var(--text)]">{domainName || (domain as any).id}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
          STATUS_STYLES[domain.status ?? 'UNKNOWN'] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'
        }`}>
          {domain.status ?? 'UNKNOWN'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--rail)] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
    </>
  );
}
