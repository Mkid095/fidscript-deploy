'use client';

import type { EmailAlias } from '@fidscript-deploy/sdk';
import { Card, EmptyState } from '@fidscript/ui';

interface Props {
  aliases: EmailAlias[];
  onDelete: (id: string) => void;
}

export function AliasList({ aliases, onDelete }: Props) {
  if (aliases.length === 0) {
    return (
      <Card className="border border-[var(--rail)]">
        <EmptyState
          title="No aliases"
          description="Create an alias to forward email to mailboxes."
        />
      </Card>
    );
  }

  return (
    <Card className="border border-[var(--rail)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--rail)]">
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Alias</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Forwards To</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Created</th>
            <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {aliases.map(alias => (
            <tr key={alias.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
              <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">{alias.alias}</td>
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{alias.forwardsTo.join(', ')}</td>
              <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                {new Date(alias.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onDelete(alias.id)}
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
