import type { FidscriptSDK } from '@fidscript-deploy/sdk';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

export interface Overview {
  total: number;
  rangeDays: number;
  byStatus: Record<string, number>;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
}
export interface Failures { failureType: string; count: number; avgDurationMs: number; }
export interface Latency { p50: number; p95: number; p99: number; count: number; }
export interface TimelineItem { date: string; sent: number; bounced: number; failed: number; }

export function useEmailAnalytics() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failures, setFailures] = useState<Failures[]>([]);
  const [latency, setLatency] = useState<Latency | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const [ov, fl, lt, tl] = await Promise.all([
        sdk.email.getDeliveryOverview(projectId),
        sdk.email.getFailureBreakdown(projectId),
        sdk.email.getLatency(projectId),
        sdk.email.getSendTimeline(projectId),
      ]);
      setOverview(ov);
      setFailures(fl);
      setLatency(lt);
      setTimeline(tl);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { load(); }, [load]);

  return { overview, failures, latency, timeline, loading, reload: load };
}
