'use client';

import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';
import type { MailboxMessage } from '@fidscript-deploy/sdk';

type Folder = 'inbox' | 'sent' | 'trash';

interface MessageListProps {
  folder: Folder;
  filtered: MailboxMessage[];
  selectedId: string | null;
  onSelect: (msg: MailboxMessage) => void;
}

export function MessageList({ folder, filtered, selectedId, onSelect }: MessageListProps) {
  return (
    <Card className="border border-[var(--rail)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--rail)]">
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 w-8"></th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">From → To</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Subject</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 w-24">Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(msg => (
            <tr
              key={msg.id}
              onClick={() => onSelect(msg)}
              className={`border-b border-[var(--rail)] last:border-0 cursor-pointer hover:bg-[var(--rail)]/30 ${
                selectedId === msg.id ? 'bg-[var(--rail)]/50' : ''
              } ${!msg.isRead ? 'bg-blue-950/10' : ''}`}
            >
              <td className="px-2 py-3 text-center">
                {msg.isStarred && <HugeiconsIcon icon={StarIcon} size={14} className="text-[var(--warning)]" />}
              </td>
              <td className="px-4 py-3 text-xs">
                <div className={`truncate ${msg.isRead ? 'text-[var(--text-muted)]' : 'text-[var(--text)] font-medium'}`}>
                  {folder === 'sent' ? `to ${msg.to}` : msg.from}
                </div>
              </td>
              <td className={`px-4 py-3 text-xs truncate max-w-xs ${msg.isRead ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
                {msg.subject}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                {new Date(msg.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
