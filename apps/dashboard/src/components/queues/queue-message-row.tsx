'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon } from '@hugeicons/core-free-icons';
import type { QueueMessage } from './use-queues-realtime';
import { STATUS_COLORS } from './queue-messages-table-hooks';

interface MessageRowProps {
  msg: QueueMessage;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function MessageRow({ msg, selected, onToggle }: MessageRowProps) {
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
            <HugeiconsIcon icon={RefreshIcon} size={10} />
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
