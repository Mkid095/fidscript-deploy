'use client';

import type { EmailAlias } from '@fidscript-deploy/sdk';

import { Button, Card } from '@fidscript/ui';
import { fmtDate, truncate } from './email-shared';

interface Props {
  alias: EmailAlias;
  busy: boolean;
  onDelete: () => void;
}

export function AliasCard({ alias, busy, onDelete }: Props) {
  return (
    <Card className="border border-[var(--rail)] p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{alias.alias}</p>
          <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">{truncate(alias.id, 14)}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-rose-400 hover:bg-rose-500/10"
          onClick={onDelete}
          loading={busy}
        >
          Delete
        </Button>
      </div>

      {alias.forwardsTo.length > 0 && (
        <div className="mt-2 space-y-1">
          {alias.forwardsTo.map((t, i) => (
            <p key={i} className="text-[11px] text-[var(--text-dim)] font-mono">
              <span className="text-[var(--accent)]">→</span> {t}
            </p>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[var(--text-dim)] mt-2">Created {fmtDate(alias.createdAt)}</p>
    </Card>
  );
}
