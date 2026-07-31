'use client';

import Link from 'next/link';
import { Button, Card, Badge, EmptyState, Spinner } from '@fidscript/ui';
import type { Domain } from '@fidscript-deploy/sdk';

type DnsStatus = Domain['dnsStatus'];
type SslStatus = Domain['sslStatus'];

function dnsVariant(s: DnsStatus): 'default' | 'warning' | 'success' | 'danger' | 'info' {
  switch (s?.toUpperCase()) {
    case 'ACTIVE':         return 'success';
    case 'TLS_PENDING':    return 'info';
    case 'VALIDATING':     return 'info';
    case 'OWNERSHIP_PENDING': return 'warning';
    case 'PENDING':        return 'default';
    case 'FAILED':
    case 'BROKEN':         return 'danger';
    default:               return 'default';
  }
}

function sslVariant(s: SslStatus): 'default' | 'warning' | 'success' | 'danger' | 'info' {
  switch (s?.toUpperCase()) {
    case 'ACTIVE':   return 'success';
    case 'ISSUING':  return 'info';
    case 'PENDING':  return 'default';
    case 'FAILED':
    case 'BROKEN':   return 'danger';
    default:         return 'default';
  }
}

interface DomainListContentProps {
  domains: Domain[];
  loading: boolean;
  projectId: string;
  verifyingId: string | null;
  onVerify: (domain: Domain) => void;
  onDelete: (domain: Domain) => void;
  onShowInstructions: (domain: Domain) => void;
  onAddDomain: () => void;
  onConnectCloudflare: () => void;
}

export function DomainListContent({
  domains,
  loading,
  projectId,
  verifyingId,
  onVerify,
  onDelete,
  onShowInstructions,
  onAddDomain,
  onConnectCloudflare,
}: DomainListContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <EmptyState
        title="No domains yet"
        description="Add a custom domain or connect Cloudflare to enable auto-DNS."
        action={
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" size="sm" onClick={onConnectCloudflare}>
              Connect Cloudflare
            </Button>
            <Button variant="primary" size="sm" onClick={onAddDomain}>
              Add Domain
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {domains.map(domain => (
        <Card
          key={domain.id}
          className="border border-[var(--rail)] p-0 overflow-hidden"
          padding="none"
        >
          <Link
            href={`/projects/${projectId}/domains/${domain.id}`}
            className="block p-4 cursor-pointer no-underline hover:bg-[var(--surface-2)]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text)] truncate">{domain.domain}</h3>
                <p className="text-xs text-[var(--text-muted)] font-mono truncate mt-0.5">
                  {domain.dnsMode === 'cloudflare_auto' ? 'Cloudflare Auto' : 'Manual DNS'}
                </p>
              </div>
              <div className="flex gap-1.5 ml-2 shrink-0">
                <Badge variant={dnsVariant(domain.dnsStatus)}>
                  {domain.dnsStatus ?? 'PENDING'}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">DNS</span>
                <Badge variant={dnsVariant(domain.dnsStatus)}>
                  {domain.dnsStatus ?? 'PENDING'}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)]">SSL</span>
                <Badge variant={sslVariant(domain.sslStatus)}>
                  {domain.sslStatus ?? 'PENDING'}
                </Badge>
              </div>
              {domain.isPrimary && <Badge variant="info">Primary</Badge>}
              {domain.apexDomain && <Badge variant="default">Apex</Badge>}
            </div>

            {(domain.type?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(domain.type ?? []).map((t: string) => {
                  const CAPABILITY_LABELS: Record<string, { label: string; color: string }> = {
                    DEPLOYMENT: { label: 'Deployment', color: 'bg-blue-900 text-blue-300' },
                    EMAIL: { label: 'Email', color: 'bg-purple-900 text-purple-300' },
                    INBOUND_EMAIL: { label: 'Inbound', color: 'bg-purple-800 text-purple-200' },
                    TRACKING: { label: 'Tracking', color: 'bg-yellow-900 text-yellow-300' },
                    API: { label: 'API', color: 'bg-green-900 text-green-300' },
                    REDIRECT: { label: 'Redirect', color: 'bg-orange-900 text-orange-300' },
                    SANDBOX: { label: 'Sandbox', color: 'bg-gray-800 text-gray-300' },
                  };
                  const { label, color } = CAPABILITY_LABELS[t] ?? { label: t, color: 'bg-[var(--rail)] text-[var(--text-muted)]' };
                  return (
                    <span key={t} className={`text-xs px-1.5 py-0.5 rounded-full ${color}`}>
                      {label}
                    </span>
                  );
                })}
              </div>
            )}

            {(domain.dnsVerifiedAt || domain.routingVerifiedAt) && (
              <div className="text-xs text-[var(--text-muted)] mb-4 space-y-0.5">
                {domain.dnsVerifiedAt && (
                  <p>DNS verified: {new Date(domain.dnsVerifiedAt).toLocaleDateString()}</p>
                )}
                {domain.routingVerifiedAt && (
                  <p>Routing verified: {new Date(domain.routingVerifiedAt).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </Link>

          <div className="border-t border-[var(--rail)] px-4 py-3 flex items-center gap-2 bg-[var(--surface-2)]">
            {domain.dnsMode === 'manual' && (
              <Button variant="ghost" size="sm" onClick={() => onShowInstructions(domain)}>
                DNS Instructions
              </Button>
            )}
            <div className="flex-1" />
            {(domain.dnsStatus === 'PENDING' || domain.dnsStatus === 'OWNERSHIP_PENDING' || domain.dnsStatus === 'VALIDATING') && (
              <Button variant="secondary" size="sm" loading={verifyingId === domain.id} onClick={() => onVerify(domain)}>
                Verify
              </Button>
            )}
            <Button
              variant="ghost" size="sm"
              className="text-[var(--danger)] hover:text-[var(--danger)]"
              onClick={() => onDelete(domain)}
            >
              Remove
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
