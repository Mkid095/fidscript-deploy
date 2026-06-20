'use client';

interface HealthBadgeProps {
  status: 'idle' | 'running' | 'healthy' | 'unhealthy' | 'unknown';
  label?: string;
}

export function HealthBadge({ status, label }: HealthBadgeProps) {
  const config: Record<string, { bg: string; text: string; dot: string; label?: string }> = {
    idle:    { bg: 'bg-slate-800', text: 'text-slate-400', dot: 'bg-slate-500' },
    running: { bg: 'bg-slate-800', text: 'text-blue-400', dot: 'bg-blue-500 animate-pulse' },
    healthy: { bg: 'bg-emerald-900/50', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    unhealthy:{ bg: 'bg-red-900/50', text: 'text-red-400', dot: 'bg-red-500' },
    unknown: { bg: 'bg-slate-800', text: 'text-slate-400', dot: 'bg-slate-500' },
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
