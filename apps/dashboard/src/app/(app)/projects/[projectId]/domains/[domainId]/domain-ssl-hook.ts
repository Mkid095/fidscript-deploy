'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DomainSslInfo } from '@fidscript-deploy/sdk';

export function useDomainSsl(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [ssl, setSsl] = useState<DomainSslInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const sslData = await sdk.domains.getSsl(projectId, domainId).catch(() => null);
      setSsl(sslData as DomainSslInfo | null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { ssl, loading, reload: load };
}
