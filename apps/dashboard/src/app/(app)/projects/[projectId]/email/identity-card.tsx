'use client';

import type { SenderIdentity } from './add-identity-modal';
import { Button, Card } from '@fidscript/ui';
import { fmtDate, truncate } from './email-shared';

interface Props {
  identity: SenderIdentity;
  busy: boolean;
  onDelete: () => void;
}

export function IdentityCard({ identity, busy, onDelete }: Props) {
  return (
    <Card className="border border-[var(--rail)] p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{identity.email}</p>
          {identity.name && (
            <p className="text-[11px] text-[var(--text-dim)] mt-0.5">{identity.name}</p>
          )}
          <p className="text-[10px] text-[var(--text-dim)] font-mono mt-1">{truncate(identity.id, 14)}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          identity.isVerified
            ? 'bg-emerald-900/40 text-[var(--success)]'
            : 'bg-[var(--rail)] text-[var(--text-muted)]'
        }`}>
          {identity.isVerified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      <p className="text-[10px] text-[var(--text-dim)] mt-2">Created {fmtDate(identity.createdAt)}</p>

      <div className="flex justify-end mt-3">
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
    </Card>
  );
}
