'use client';

import { Card } from '@fidscript/ui';
import { MetricCard } from './analytics-metrics';

interface Overview {
  total: number;
  rangeDays: number;
  byStatus: Record<string, number>;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
}

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

function pct(n: number): string { return (n * 100).toFixed(1) + '%'; }

interface Props { overview: Overview; }

export function AnalyticsOverview({ overview }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Delivery Rate" value={pct(overview.deliveryRate)} color="text-[var(--success)]" />
        <MetricCard label="Bounce Rate" value={pct(overview.bounceRate)} color="text-[var(--danger)]" />
        <MetricCard label="Open Rate" value={pct(overview.openRate)} color="text-[var(--accent)]" />
        <MetricCard label="Click Rate" value={pct(overview.clickRate)} color="text-purple-400" />
      </div>

      <Card className="border border-[var(--rail)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Status Breakdown ({overview.total} total)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(overview.byStatus).filter(([, v]) => v > 0).map(([key, val]) => {
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
    </>
  );
}
