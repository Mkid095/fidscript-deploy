'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Domain, DnsRecord } from '@fidscript-deploy/sdk';

export function useDomainEmail(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [domain, setDomain] = useState<Domain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [domainData, dnsData] = await Promise.all([
        sdk.domains.get(domainId).catch(() => null),
        sdk.domains.getDnsRecords(projectId, domainId).catch(() => null),
      ]);
      if (domainData) setDomain(domainData as Domain);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setDnsRecords(d.records ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { domain, dnsRecords, loading, reload: load };
}
