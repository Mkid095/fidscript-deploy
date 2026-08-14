'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DomainIncident, DomainVerificationRun } from '@fidscript-deploy/sdk';

export function useDomainRepairs(
  projectId: string,
  domainId: string,
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>,
) {
  const [incidents, setIncidents] = useState<DomainIncident[]>([]);
  const [history, setHistory] = useState<DomainVerificationRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [incidentData, historyData] = await Promise.all([
        sdk.domains.getIncidents(projectId, domainId).catch(() => null),
        sdk.domains.getHistory(projectId, domainId).catch(() => null),
      ]);
      if (incidentData) setIncidents(incidentData as DomainIncident[]);
      if (historyData) setHistory(historyData as DomainVerificationRun[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  return { incidents, history, loading, reload: load };
}
