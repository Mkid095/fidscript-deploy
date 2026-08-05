'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { File02Icon } from '@hugeicons/core-free-icons';
import type { QueueMessage, MessageTab } from './use-queues-realtime';
import { MessageRow } from './queue-message-row';

interface QueueMessagesTableProps {
  messages: QueueMessage[];
  stats: { pending: number; delivered: number; deadLettered: number } | null;
  activeTab: MessageTab;
  selected: Set<string>;
  onTabChange: (tab: MessageTab) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

const TAB_LABELS: Record<MessageTab, string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  'dead-letter': 'Dead Letter',
};

const STAT_COLORS: Record<MessageTab, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  'dead-letter': 'bg-rose-500/10 text-rose-400',
};

export function QueueMessagesTable({
  messages,
  stats,
  activeTab,
  selected,
  onTabChange,
  onToggleSelect,
  onToggleSelectAll,
}: QueueMessagesTableProps) {
  const tabs: MessageTab[] = ['pending', 'delivered', 'dead-letter'];

  return (
    <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl overflow-hidden">
      <div className="flex items-center border-b border-[var(--rail)] px-4 gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            {TAB_LABELS[tab]}
            {stats && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${STAT_COLORS[tab]}`}>
                {tab === 'pending' ? stats.pending : tab === 'delivered' ? stats.delivered : stats.deadLettered}
              </span>
            )}
          </button>
        ))}
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--rail)] flex items-center justify-center mb-3">
            <HugeiconsIcon icon={File02Icon} size={20} className="text-[var(--text-dim)]" />
          </div>
          <p className="text-xs text-[var(--text-dim)]">No {activeTab} messages</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="w-8 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.size === messages.length && messages.length > 0}
                    onChange={onToggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Message ID</th>
                <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Body</th>
                <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Attempts</th>
                <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Received</th>
                <th className="px-3 py-2.5 text-left text-[var(--text-dim)] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  selected={selected.has(msg.id)}
                  onToggle={onToggleSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
