'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Domain, DomainHealth } from '@fidscript-deploy/sdk';

export function useDomainOverview(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [domain, setDomain] = useState<Domain | null>(null);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [domainData, healthData] = await Promise.all([
        sdk.domains.get(domainId).catch(() => null),
        sdk.domains.getHealth(projectId, domainId).catch(() => null),
      ]);
      if (!domainData) { setError('Domain not found'); return; }
      setDomain(domainData as Domain);
      setHealth(healthData as DomainHealth | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { domain, health, loading, error, reload: load };
}
