import React from 'react';

/**
 * Tabs — controlled, context-free tab bar.
 *
 * A simple horizontal segmented control for switching between views.
 * The caller controls the active value and renders the panel content.
 *
 * Accessibility:
 *   - role="tablist" on the container, role="tab" on each trigger
 *   - aria-selected on the active tab
 *   - Arrow Left/Right moves focus between tabs and activates them
 *
 * Props:
 *   - tabs: array of { id, label, icon? (ReactNode), disabled? }
 *   - value: the active tab id
 *   - onChange: called with the new tab id
 *   - size: 'sm' | 'md'
 *   - fullWidth: stretch tabs to fill the container width
 */
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export function Tabs({ tabs, value, onChange, size = 'md', fullWidth = false, className = '' }: TabsProps) {
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    // Find next non-disabled tab in the given direction
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    let next = index;
    for (let i = 0; i < tabs.length; i++) {
      next = (next + dir + tabs.length) % tabs.length;
      if (!tabs[next].disabled) {
        onChange(tabs[next].id);
        // Move focus to the newly selected tab
        const el = (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.querySelector<HTMLElement>(`[data-tab-index="${next}"]`);
        el?.focus();
        break;
      }
    }
  };

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div
      role="tablist"
      aria-label="Tabs"
      className={`inline-flex items-center gap-1 rounded-lg bg-[var(--canvas)] border border-[var(--rail)] p-1 ${className} ${fullWidth ? 'flex w-full' : ''}`}
    >
      {tabs.map((tab, i) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            data-tab-index={i}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={e => onKeyDown(e, i)}
            className={`
              inline-flex items-center justify-center gap-1.5 rounded-md font-medium
              transition-all duration-150 outline-none
              ${fullWidth ? 'flex-1' : ''}
              ${pad}
              ${isActive
                ? 'bg-[var(--surface-2)] text-[var(--text)] shadow-sm'
                : tab.disabled
                  ? 'text-[var(--text-dim)] cursor-not-allowed'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              }
              focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40
            `}
          >
            {tab.icon && <span className="flex items-center justify-center">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
