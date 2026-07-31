'use client';

interface SparklineProps {
  sparkline: { status: string; durationMs: number | null }[];
}

export function Sparkline({ sparkline }: SparklineProps) {
  if (sparkline.length === 0) return null;
  const maxMs = Math.max(...sparkline.filter(s => s.durationMs != null).map(s => s.durationMs as number), 1);
  return (
    <div className="flex items-end gap-px h-4">
      {sparkline.map((s, i) => {
        const barH = s.durationMs != null
          ? Math.max(2, Math.round((s.durationMs / maxMs) * 14))
          : 4;
        const dotColor = s.status === 'completed' ? 'bg-[var(--success)]'
          : s.status === 'failed' ? 'bg-[var(--danger)]'
          : 'bg-[var(--text-dim)]';
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${dotColor}`}
            style={{ height: `${barH}px` }}
          />
        );
      })}
    </div>
  );
}
