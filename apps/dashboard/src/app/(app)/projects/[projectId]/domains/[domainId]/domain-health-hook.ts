'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { DomainHealth } from '@fidscript-deploy/sdk';

interface UseDomainHealthOptions { polling?: boolean }

export function useDomainHealth(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
  options: UseDomainHealthOptions = {},
) {
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const healthData = await sdk.domains.getHealth(projectId, domainId).catch(() => null);
      setHealth(healthData as DomainHealth | null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  function startPolling() {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    let attempts = 0;
    function poll() {
      if (attempts >= 20) return;
      attempts++;
      getSdk().domains.getHealth(projectId, domainId)
        .then((result: unknown) => {
          const h = result as DomainHealth | null;
          if (h && h.status !== 'degraded') { setHealth(h); setCheckingHealth(false); return; }
          pollingRef.current = setTimeout(poll, 3000);
        })
        .catch(() => { pollingRef.current = setTimeout(poll, 3000); });
    }
    pollingRef.current = setTimeout(poll, 3000);
  }

  async function triggerHealthCheck() {
    setCheckingHealth(true);
    try {
      await getSdk().domains.triggerHealthCheck(projectId, domainId);
      if (options.polling) startPolling();
      else await load();
    } catch { setCheckingHealth(false); }
  }

  useEffect(() => () => { if (pollingRef.current) clearTimeout(pollingRef.current); }, []);

  return { health, loading, checkingHealth, triggerHealthCheck, reload: load };
}
