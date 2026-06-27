'use client';

interface HealthBadgeProps {
  status: 'idle' | 'running' | 'healthy' | 'unhealthy' | 'unknown';
  label?: string;
}

export function HealthBadge({ status, label }: HealthBadgeProps) {
  const config: Record<string, { bg: string; text: string; dot: string; label?: string }> = {
    idle:    { bg: 'bg-[var(--rail)]', text: 'text-[var(--text-muted)]', dot: 'bg-slate-500' },
    running: { bg: 'bg-[var(--rail)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)] animate-pulse' },
    healthy: { bg: 'bg-emerald-900/50', text: 'text-[var(--success)]', dot: 'bg-[var(--success)]' },
    unhealthy:{ bg: 'bg-red-900/50', text: 'text-[var(--danger)]', dot: 'bg-[var(--danger)]' },
    unknown: { bg: 'bg-[var(--rail)]', text: 'text-[var(--text-muted)]', dot: 'bg-slate-500' },
  };

  const c = config[status] ?? config.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {label ?? (status === 'healthy' ? 'Healthy' : status === 'unhealthy' ? 'Failed' : status === 'running' ? 'Checking…' : 'Unknown')}
    </span>
  );
}
