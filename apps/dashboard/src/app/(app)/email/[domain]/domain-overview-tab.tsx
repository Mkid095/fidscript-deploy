'use client';

import type { EmailDomain } from '@fidscript-deploy/sdk';
import { Card } from '@fidscript/ui';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[var(--rail)] text-[var(--text-muted)]',
  VERIFIED: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE: 'bg-emerald-900 text-[var(--success)]',
  FAILED: 'bg-red-900 text-[var(--danger)]',
};

interface Props {
  domain: EmailDomain & Record<string, unknown>;
}

export function DomainOverviewTab({ domain }: Props) {
  const domainName = domain.domain ?? domain.name ?? '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Domain Info */}
      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Domain Information</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex gap-4">
            <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">Domain ID</dt>
            <dd className="text-[var(--text-muted)] font-mono text-xs">{domain.id}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">Status</dt>
            <dd className="text-[var(--text-muted)] capitalize">{domain.status ?? 'UNKNOWN'}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-[var(--text-muted)] w-32 flex-shrink-0">Created</dt>
            <dd className="text-[var(--text-muted)]">{new Date(domain.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </Card>

      {/* DNS Records */}
      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">DNS Configuration</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Add the following DNS records to verify ownership and receive email.
        </p>
        <div className="space-y-3">
          {/* MX Record */}
          <div className="rounded border border-[var(--rail)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">MX Record</span>
              <span className="text-xs text-[var(--text-muted)]">Required</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">@</span></p>
              <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">MX</span></p>
              <p className="text-[var(--text-muted)]">Priority: <span className="text-[var(--text)]">10</span></p>
              <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)]">mail.{domainName}</span></p>
            </div>
          </div>

          {/* TXT Verification */}
          <div className="rounded border border-[var(--rail)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">TXT Verification</span>
              <span className="text-xs text-[var(--text-muted)]">Required</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">@</span></p>
              <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
              <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)] break-all">fidscript-verification={domain.id.slice(0, 16)}</span></p>
            </div>
          </div>

          {/* DKIM Record */}
          {domain.dkimPublicKey && (
            <div className="rounded border border-[var(--rail)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text-muted)]">DKIM Record</span>
                <span className="text-xs text-[var(--text-muted)]">Recommended</span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">{(domain.dkimSelector ?? 'mailchannels')}._domainkey.{domainName}</span></p>
                <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
                <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)] break-all">{domain.dkimPublicKey}</span></p>
              </div>
            </div>
          )}

          {/* SPF Record */}
          <div className="rounded border border-[var(--rail)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">SPF Record</span>
              <span className="text-xs text-[var(--text-muted)]">Recommended</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">@</span></p>
              <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
              <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)]">v=spf1 include:_spf.{domainName} ~all</span></p>
            </div>
          </div>

          {/* DMARC Record */}
          <div className="rounded border border-[var(--rail)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">DMARC Record</span>
              <span className="text-xs text-[var(--text-muted)]">Recommended</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <p className="text-[var(--text-muted)]">Name: <span className="text-[var(--text)]">_dmarc.{domainName}</span></p>
              <p className="text-[var(--text-muted)]">Type: <span className="text-[var(--text)]">TXT</span></p>
              <p className="text-[var(--text-muted)]">Value: <span className="text-[var(--text)]">v=DMARC1; p=quarantine; rua=mailto:dmarc@{domainName}</span></p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
