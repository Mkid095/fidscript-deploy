'use client';

interface FunctionTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  logStream?: boolean;
}

const TABS = [
  { key: 'code', label: 'Code' },
  { key: 'logs', label: 'Logs' },
  { key: 'versions', label: 'Versions' },
  { key: 'settings', label: 'Settings' },
  { key: 'invoke', label: 'Invoke' },
];

export function FunctionTabs({ activeTab, onTabChange, logStream }: FunctionTabsProps) {
  return (
    <div className="border-b border-[var(--rail)]">
      <nav className="flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              relative px-4 py-2.5 text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? 'text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }
            `}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.key === 'logs' && logStream && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </span>

            {/* Active indicator */}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
