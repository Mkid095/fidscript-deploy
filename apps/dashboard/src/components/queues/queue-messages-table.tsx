'use client';

import { Icon } from '@iconify/react';
import type { QueueMessage, MessageTab } from './use-queues-realtime';

const STATUS_COLORS: Record<string, string> = {
  pending:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  delivered:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'dead-letter': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  active:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  paused:       'text-amber-400 bg-amber-500/10 border-amber-500/20',
};


interface MessageRowProps {
  msg: QueueMessage;
  selected: boolean;
  onToggle: (id: string) => void;
}

function MessageRow({ msg, selected, onToggle }: MessageRowProps) {
  return (
    <tr
      className={`border-b border-[var(--rail)] last:border-0 hover:bg-[var(--surface)]/50 transition-colors cursor-pointer ${selected ? 'bg-[var(--accent)]/5' : ''}`}
      onClick={() => onToggle(msg.id)}
    >
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(msg.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded"
        />
      </td>
      <td className="px-3 py-2.5 text-[var(--text-dim)] font-mono text-[10px]">{msg.id}</td>
      <td className="px-3 py-2.5 max-w-xs truncate font-mono text-[10px] text-[var(--text)]" title={msg.body}>
        {msg.body.length > 80 ? msg.body.slice(0, 80) + '…' : msg.body}
      </td>
      <td className="px-3 py-2.5 text-[var(--text-dim)]">
        {msg.attempts > 0 && (
          <span className={`inline-flex items-center gap-1 ${msg.attempts >= 3 ? 'text-rose-400' : 'text-amber-400'}`}>
            <Icon icon="icons8:refresh" width={10} height={10} />
            {msg.attempts}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-[var(--text-dim)] whitespace-nowrap">
        {new Date(msg.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="px-3 py-2.5">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_COLORS[msg.status] ?? ''}`}>
          {msg.status}
        </span>
      </td>
    </tr>
  );
}

interface QueueMessagesTableProps {
  messages: QueueMessage[];
  stats: { pending: number; delivered: number; deadLettered: number } | null;
  activeTab: MessageTab;
  selected: Set<string>;
  onTabChange: (tab: MessageTab) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function QueueMessagesTable({
  messages,
  stats,
  activeTab,
  selected,
  onTabChange,
  onToggleSelect,
  onToggleSelectAll,
}: QueueMessagesTableProps) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--rail)] px-4 gap-1 overflow-x-auto">
        {(['pending', 'delivered', 'dead-letter'] as MessageTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            {tab === 'dead-letter' ? 'Dead Letter' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {stats && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                tab === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-rose-500/10 text-rose-400'
              }`}>
                {tab === 'pending' ? stats.pending : tab === 'delivered' ? stats.delivered : stats.deadLettered}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--rail)] flex items-center justify-center mb-3">
            <Icon icon="icons8:document" width={20} height={20} className="text-[var(--text-dim)]" />
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
