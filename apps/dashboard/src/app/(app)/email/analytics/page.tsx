'use client';

import { useEffect, useState, useCallback } from 'react';
import { Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { AnalyticsOverview } from './analytics-overview';
import { AnalyticsTimeline } from './analytics-timeline';
import { AnalyticsFailureLatency } from './analytics-failure-latency';

interface Overview {
  total: number;
  rangeDays: number;
  byStatus: Record<string, number>;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
}
interface Failures { failureType: string; count: number; avgDurationMs: number; }
interface Latency { p50: number; p95: number; p99: number; count: number; }
interface TimelineItem { date: string; sent: number; bounced: number; failed: number; }

export default function AnalyticsPage() {
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

  if (loading) return <div className="flex items-center justify-center min-h-48"><Spinner size="lg" /></div>;

  if (!overview) return null;

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text)] mb-1">Email Analytics</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">Delivery performance over the last {overview.rangeDays} days</p>

      <AnalyticsOverview overview={overview} />
      <AnalyticsTimeline timeline={timeline} />
      <AnalyticsFailureLatency failures={failures} latency={latency} />
    </div>
  );
}
