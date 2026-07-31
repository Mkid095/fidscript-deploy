'use client';

type Tab = 'overview' | 'mailboxes' | 'aliases' | 'catchall';

interface DomainTabsProps {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  mailboxCount: number;
  aliasCount: number;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'mailboxes', label: 'Mailboxes' },
  { id: 'aliases', label: 'Aliases' },
  { id: 'catchall', label: 'Catch-all' },
];

export function DomainTabs({ activeTab, onTabChange, mailboxCount, aliasCount }: DomainTabsProps) {
  const tabs = TABS.map(t => ({
    ...t,
    label: t.id === 'mailboxes' ? `Mailboxes (${mailboxCount})` :
           t.id === 'aliases' ? `Aliases (${aliasCount})` : t.label,
  }));

  return (
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
  );
}
