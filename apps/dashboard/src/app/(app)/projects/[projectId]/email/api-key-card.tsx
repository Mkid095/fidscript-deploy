'use client';

import type { EmailApiKey } from './add-api-key-modal';

import { Button, Card } from '@fidscript/ui';
import { fmtDate, truncate } from './email-shared';

interface Props {
  apiKey: EmailApiKey;
  busy: boolean;
  onDelete: () => void;
}

export function ApiKeyCard({ apiKey, busy, onDelete }: Props) {
  return (
    <Card className="border border-[var(--rail)] p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{apiKey.name}</p>
          <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">{truncate(apiKey.id, 14)}</p>
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

      <div className="flex flex-wrap gap-2 mt-2">
        {apiKey.scopes.map(s => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--rail)] text-[var(--text-muted)] font-mono">
            {s}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-dim)] mt-2">
        {apiKey.dailyLimit}/day · {apiKey.monthlyLimit}/month
      </p>
      <p className="text-[10px] text-[var(--text-dim)] mt-1">
        Created {fmtDate(apiKey.createdAt)} · Last used {fmtDate(apiKey.lastUsedAt ?? null)}
      </p>
    </Card>
  );
}
