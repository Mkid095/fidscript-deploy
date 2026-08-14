'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DnsRecord } from '@fidscript-deploy/sdk';

export function useDnsRecords(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const dnsData = await sdk.domains.getDnsRecords(projectId, domainId).catch(() => null);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setDnsRecords(d.records ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { dnsRecords, loading, reload: load };
}
