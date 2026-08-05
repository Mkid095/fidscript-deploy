'use client';

import { Spinner } from '@fidscript/ui';

import { AnalyticsOverview } from './analytics-overview';
import { AnalyticsTimeline } from './analytics-timeline';
import { AnalyticsFailureLatency } from './analytics-failure-latency';
import { useEmailAnalytics } from './analytics-hooks';

export default function AnalyticsPage() {
  const { overview, failures, latency, timeline, loading } = useEmailAnalytics();

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
