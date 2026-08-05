'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle03Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';

interface FunctionCodeMetricsProps {
  invocations?: number;
  errorRate?: number;
  avgLatencyMs?: number;
}

export function FunctionCodeMetrics({
  invocations,
  errorRate,
  avgLatencyMs,
}: FunctionCodeMetricsProps) {
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-b border-[var(--rail)] bg-[var(--surface-2)]/20">
      <MetricItem
        label="Invocations"
        value={invocations != null ? invocations.toLocaleString() : '—'}
      />
      <MetricItem
        label="Avg latency"
        value={avgLatencyMs != null ? `${avgLatencyMs}ms` : '—'}
      />
      <MetricItem
        label="Error rate"
        value={errorRate != null ? `${errorRate}%` : '—'}
        highlight={errorRate != null && errorRate > 5}
      />
    </div>
  );
}

function MetricItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {highlight && (
        <HugeiconsIcon
          icon={AlertCircleIcon}
          size={12}
          className="text-amber-400"
        />
      )}
      <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
      <span className={`text-[11px] font-medium ${highlight ? 'text-amber-400' : 'text-[var(--text)]'}`}>
        {value}
      </span>
    </div>
  );
}
