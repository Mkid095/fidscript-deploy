'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Spinner } from '@fidscript-deploy/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

interface Overview {
  total: number;
  rangeDays: number;
  byStatus: Record<string, number>;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
}
interface Failures { failureType: string; count: number; avgDurationMs: number; }[]
interface Latency { p50: number; p95: number; p99: number; count: number; }
interface TimelineItem { date: string; sent: number; bounced: number; failed: number; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued: { label: 'Queued', color: '#6b7280' },
  processing: { label: 'Processing', color: '#f59e0b' },
  sent: { label: 'Sent', color: '#3b82f6' },
  delivered: { label: 'Delivered', color: '#10b981' },
  opened: { label: 'Opened', color: '#8b5cf6' },
  clicked: { label: 'Clicked', color: '#ec4899' },
  bounced: { label: 'Bounced', color: '#ef4444' },
  softBounce: { label: 'Soft Bounce', color: '#f97316' },
  dead: { label: 'Dead', color: '#7f1d1d' },
  failed: { label: 'Failed', color: '#dc2626' },
  received: { label: 'Received', color: '#06b6d4' },
};

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

export default function AnalyticsPage() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failures, setFailures] = useState<any[]>([]);
  const [latency, setLatency] = useState<Latency | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const sdk = getSdk();
      const pid = projectId;
      const [ov, fl, lt, tl] = await Promise.all([
        sdk.email.getDeliveryOverview(pid),
        sdk.email.getFailureBreakdown(pid),
        sdk.email.getLatency(pid),
        sdk.email.getSendTimeline(pid),
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

  const maxTimelineVal = Math.max(...timeline.map(t => Math.max(t.sent, t.bounced, t.failed)), 1);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text)] mb-1">Email Analytics</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">Delivery performance over the last {overview?.rangeDays ?? 30} days</p>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Delivery Rate" value={overview ? pct(overview.deliveryRate) : '—'} color="text-[var(--success)]" />
        <MetricCard label="Bounce Rate" value={overview ? pct(overview.bounceRate) : '—'} color="text-[var(--danger)]" />
        <MetricCard label="Open Rate" value={overview ? pct(overview.openRate) : '—'} color="text-[var(--accent)]" />
        <MetricCard label="Click Rate" value={overview ? pct(overview.clickRate) : '—'} color="text-purple-400" />
      </div>

      {/* Status Breakdown */}
      <Card className="border border-[var(--rail)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Status Breakdown ({overview?.total ?? 0} total)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(overview?.byStatus ?? {}).filter(([, v]) => v > 0).map(([key, val]) => {
            const meta = STATUS_LABELS[key] ?? { label: key, color: '#6b7280' };
            return (
              <div key={key} className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                  <span className="text-xs text-[var(--text-muted)]">{meta.label}</span>
                </div>
                <span className="text-lg font-bold text-[var(--text)]">{val}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <Card className="border border-[var(--rail)] p-5 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Daily Send Volume</h2>
          <div className="flex items-end gap-1 h-40">
            {timeline.map(t => (
              <div key={t.date} className="flex-1 flex flex-col justify-end gap-0.5" title={`${t.date}: ${t.sent} sent, ${t.bounced} bounced, ${t.failed} failed`}>
                {t.failed > 0 && <div className="bg-red-500 rounded-t" style={{ height: `${(t.failed / maxTimelineVal) * 100}%` }} />}
                {t.bounced > 0 && <div className="bg-orange-500" style={{ height: `${(t.bounced / maxTimelineVal) * 100}%` }} />}
                {t.sent > 0 && <div className="bg-emerald-500" style={{ height: `${(t.sent / maxTimelineVal) * 100}%` }} />}
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Sent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Bounced</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Breakdown */}
        <Card className="border border-[var(--rail)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Failure Breakdown</h2>
          {failures.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No failures in this period 🎉</p>
          ) : (
            <div className="space-y-2">
              {failures.map(f => (
                <div key={f.failureType} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text)] font-mono">{f.failureType}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--danger)] font-semibold">{f.count}</span>
                    <span className="text-xs text-[var(--text-muted)]">{f.avgDurationMs}ms avg</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Latency */}
        <Card className="border border-[var(--rail)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Delivery Latency ({latency?.count ?? 0} samples)</h2>
          <div className="space-y-3">
            <LatencyBar label="p50" value={latency?.p50 ?? 0} max={latency?.p99 ?? 1} color="bg-emerald-500" />
            <LatencyBar label="p95" value={latency?.p95 ?? 0} max={latency?.p99 ?? 1} color="bg-amber-500" />
            <LatencyBar label="p99" value={latency?.p99 ?? 0} max={latency?.p99 ?? 1} color="bg-red-500" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function LatencyBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-muted)] w-8">{label}</span>
      <div className="flex-1 bg-[var(--rail)] rounded-full h-4 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="text-xs text-[var(--text)] w-20 text-right">{value}ms</span>
    </div>
  );
}
