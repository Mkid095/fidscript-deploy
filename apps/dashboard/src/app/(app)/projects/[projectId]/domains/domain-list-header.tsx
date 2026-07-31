'use client';

import type { Domain, DnsConnection } from '@fidscript-deploy/sdk';
import { Button } from '@fidscript/ui';

interface DomainListHeaderProps {
  domains: Domain[];
  connection: DnsConnection | null;
  onAddDomain: () => void;
  onConnectCloudflare: () => void;
}

export function DomainListHeader({
  domains,
  connection,
  onAddDomain,
  onConnectCloudflare,
}: DomainListHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Domains</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {domains.length} domain{domains.length !== 1 ? 's' : ''} &middot;{' '}
            {connection
              ? <span className="text-[var(--success)]">Cloudflare connected</span>
              : <span>No DNS provider</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!connection && (
            <Button variant="secondary" size="sm" onClick={onConnectCloudflare}>
              Connect Cloudflare
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onAddDomain}>
            Add Domain
          </Button>
        </div>
      </div>

      {/* Cloudflare connection banner */}
      {connection && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/10 px-4 py-3">
          <svg className="w-4 h-4 text-[var(--success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">
            <span className="text-sm font-medium text-[var(--success)]">Cloudflare</span>
            <span className="text-sm text-[var(--text-muted)] ml-2">
              {connection.email ? `${connection.email} · ` : ''}Auto-DNS enabled
            </span>
          </div>
          <button
            onClick={onConnectCloudflare}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] underline"
          >
            Change
          </button>
        </div>
      )}
    </>
  );
}
