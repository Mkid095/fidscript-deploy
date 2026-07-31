'use client';

import Link from 'next/link';
import type { EmailDomain } from '@fidscript-deploy/sdk';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-[var(--rail)]',
  VERIFIED: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE: 'bg-emerald-900 text-[var(--success)]',
  FAILED: 'bg-red-900 text-[var(--danger)]',
};

interface Props {
  domain: EmailDomain & Record<string, unknown>;
  domainId: string;
}

export function DomainHeader({ domain, domainId }: Props) {
  const domainName = domain.domain ?? domain.name ?? '';
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link href="/email" className="text-[var(--text-muted)] hover:text-[var(--text-muted)] text-sm no-underline">
        Email
      </Link>
      <span className="text-[var(--text-dim)]">/</span>
      <h1 className="text-xl font-bold text-[var(--text)]">{domainName || domainId}</h1>
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
        STATUS_STYLES[domain.status ?? 'UNKNOWN'] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'
      }`}>
        {domain.status ?? 'UNKNOWN'}
      </span>
    </div>
  );
}

export type { EmailDomain };
