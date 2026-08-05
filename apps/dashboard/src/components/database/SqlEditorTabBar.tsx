'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon, Cancel01Icon, CheckmarkCircle03Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import type { SqlTab } from './sql-editor.types';

interface SqlEditorTabBarProps {
  tabs: SqlTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  closeTab: (id: string) => void;
  addTab: () => void;
}

export function SqlEditorTabBar({
  tabs, activeTabId, setActiveTabId, closeTab, addTab,
}: SqlEditorTabBarProps) {
  return (
    <div className="flex items-center bg-[var(--surface)] border-b border-[var(--rail)] flex-shrink-0 overflow-x-auto">
      <div className="flex items-center min-w-0">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`group flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-r border-[var(--rail)] min-w-0 cursor-pointer ${
              activeTabId === tab.id
                ? 'text-[var(--text)] bg-[var(--surface-2)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/20'
            }`}
          >
            {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />}
            <span className="truncate max-w-[120px]">{tab.name}</span>
            {tabs.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={10} />
              </button>
            )}
            {tab.status === 'running' && (
              <span className="w-3 h-3 border border-[var(--text-dim)]/30 border-t-[var(--text-dim)] rounded-full animate-spin flex-shrink-0" />
            )}
            {tab.status === 'success' && (
              <HugeiconsIcon icon={CheckmarkCircle03Icon} size={11} className="text-emerald-400 flex-shrink-0" />
            )}
            {tab.status === 'error' && (
              <HugeiconsIcon icon={AlertCircleIcon} size={11} className="text-rose-400 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => addTab()}
        className="flex-shrink-0 p-2 text-[var(--text-dim)] hover:text-[var(--text)]"
        title="New tab"
      >
        <HugeiconsIcon icon={Add01Icon} size={14} />
      </button>
    </div>
  );
}
