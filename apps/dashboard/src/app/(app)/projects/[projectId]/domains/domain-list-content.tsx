'use client';

import { EmptyState, Spinner } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import type { Domain } from '@fidscript-deploy/sdk';
import { DomainCard } from './domain-card';

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
            <Button variant="secondary" size="sm" onClick={onConnectCloudflare}>Connect Cloudflare</Button>
            <Button variant="primary" size="sm" onClick={onAddDomain}>Add Domain</Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {domains.map(domain => (
        <DomainCard
          key={domain.id}
          domain={domain}
          projectId={projectId}
          verifyingId={verifyingId}
          onVerify={() => onVerify(domain)}
          onDelete={() => onDelete(domain)}
          onShowInstructions={() => onShowInstructions(domain)}
        />
      ))}
    </div>
  );
}
