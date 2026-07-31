'use client';

interface MetricCardProps { label: string; value: string; color: string; }

export function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

interface LatencyBarProps { label: string; value: number; max: number; color: string; }

export function LatencyBar({ label, value, max, color }: LatencyBarProps) {
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
