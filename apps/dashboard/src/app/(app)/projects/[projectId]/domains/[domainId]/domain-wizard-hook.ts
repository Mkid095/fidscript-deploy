'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DnsRecord, DomainHealth } from '@fidscript-deploy/sdk';

export function useDomainWizard(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [dnsData, healthData] = await Promise.all([
        sdk.domains.getDnsRecords(projectId, domainId).catch(() => null),
        sdk.domains.getHealth(projectId, domainId).catch(() => null),
      ]);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setRecords(d.records ?? []);
      }
      if (healthData) setHealth(healthData as DomainHealth);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { records, health, loading, reload: load };
}
