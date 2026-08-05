'use client';

import Link from 'next/link';
import type { Mailbox } from '@fidscript-deploy/sdk';
import { Card, EmptyState, Button } from '@fidscript/ui';

interface Props {
  domainId: string;
  mailboxes: Mailbox[];
  onDelete: (id: string) => void;
}

export function MailboxList({ domainId, mailboxes, onDelete }: Props) {
  if (mailboxes.length === 0) {
    return (
      <Card className="border border-[var(--rail)]">
        <EmptyState
          title="No mailboxes"
          description="Create a mailbox to start receiving email."
        />
      </Card>
    );
  }

  return (
    <Card className="border border-[var(--rail)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--rail)]">
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Email</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Name</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Created</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mailboxes.map(mb => (
            <tr key={mb.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
              <td className="px-4 py-3">
                <Link
                  href={`/email/${domainId}/mailboxes/${mb.id}`}
                  className="text-[var(--text)] hover:text-[var(--accent)] no-underline font-mono text-xs"
                >
                  {mb.email}
                </Link>
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{mb.name ?? '—'}</td>
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                {new Date(mb.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onDelete(mb.id)}
                  className="text-xs text-[var(--danger)] hover:text-[var(--danger)] bg-none border-none cursor-pointer p-0"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
