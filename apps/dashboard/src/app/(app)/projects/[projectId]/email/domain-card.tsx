'use client';

import type { EmailDomain } from '@fidscript-deploy/sdk';

import { Button, Card } from '@fidscript/ui';
import { DOMAIN_STATUS_TONE, VERIFY_TONE, truncate } from './email-shared';

interface Props {
  domain: EmailDomain;
  onDelete: () => void;
  onVerify: () => void;
}

export function DomainCard({ domain, onDelete, onVerify }: Props) {
  return (
    <Card className="border border-[var(--rail)] p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{domain.domain}</p>
          <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">{truncate(domain.id, 14)}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${
          DOMAIN_STATUS_TONE[domain.status] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'
        }`}>
          {domain.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(['dkimVerified', 'spfVerified', 'dmarcVerified', 'mxVerified'] as const).map(key => (
          <span key={key} className="text-[10px] flex items-center gap-1">
            <span className="text-[var(--text-dim)] uppercase">{key.replace('Verified', '')}</span>
            <span className={`px-1.5 py-0.5 rounded-full font-mono ${
              VERIFY_TONE[String(domain[key])]
            }`}>{domain[key] ? 'OK' : 'X'}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onVerify}>Verify</Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-rose-400 hover:bg-rose-500/10"
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
