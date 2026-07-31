'use client';

import Link from 'next/link';
import type { EmailDomain } from '@fidscript-deploy/sdk';

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-[var(--rail)] text-[var(--text-muted)]',
  VERIFIED: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE:   'bg-emerald-900 text-[var(--success)]',
  FAILED:   'bg-red-900 text-[var(--danger)]',
};

const VERIFY_COLORS: Record<string, string> = {
  true:  'bg-emerald-900 text-[var(--success)]',
  false: 'bg-[var(--rail)] text-[var(--text-muted)]',
};

export function DomainCard({ domain }: { domain: EmailDomain }) {
  return (
    <Link href={`/email/${domain.id}`} className="no-underline">
      <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-5 cursor-pointer transition-colors duration-150 hover:border-[var(--accent)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{domain.domain}</h3>
            <p className="text-xs text-[var(--text-muted)] font-mono">{domain.id.slice(0, 12)}…</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[domain.status ?? 'UNKNOWN'] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
            {domain.status ?? 'UNKNOWN'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['dkim', 'spf', 'dmarc', 'mx'] as const).map((rec) => (
            <span key={rec} className="flex items-center gap-1">
              <span className="text-xs text-[var(--text-muted)] capitalize">{rec}:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${VERIFY_COLORS[String(domain[`${rec}Verified`])]}`}>
                {domain[`${rec}Verified`] ? '✓' : '✗'}
              </span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
