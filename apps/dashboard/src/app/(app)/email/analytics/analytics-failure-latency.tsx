'use client';

import { Card } from '@fidscript/ui';
import { LatencyBar } from './analytics-metrics';

interface Failures { failureType: string; count: number; avgDurationMs: number; }
interface Latency { p50: number; p95: number; p99: number; count: number; }

interface Props { failures: Failures[]; latency: Latency | null; }

export function AnalyticsFailureLatency({ failures, latency }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border border-[var(--rail)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Failure Breakdown</h2>
        {failures.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No failures in this period</p>
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

      <Card className="border border-[var(--rail)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Delivery Latency ({latency?.count ?? 0} samples)</h2>
        <div className="space-y-3">
          <LatencyBar label="p50" value={latency?.p50 ?? 0} max={latency?.p99 ?? 1} color="bg-emerald-500" />
          <LatencyBar label="p95" value={latency?.p95 ?? 0} max={latency?.p99 ?? 1} color="bg-amber-500" />
          <LatencyBar label="p99" value={latency?.p99 ?? 0} max={latency?.p99 ?? 1} color="bg-red-500" />
        </div>
      </Card>
    </div>
  );
}
