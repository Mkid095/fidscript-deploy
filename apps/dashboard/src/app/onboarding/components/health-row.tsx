'use client';

interface HealthRowProps {
  label: string;
  detail?: string;
  ok: boolean | null;
}

export function HealthRow({ label, detail, ok }: HealthRowProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)]">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text)]">{label}</div>
        {detail && <div className="text-xs text-[var(--text-muted)] mt-0.5">{detail}</div>}
      </div>
      {ok === null ? (
        <div className="w-2 h-2 rounded-full bg-slate-600" />
      ) : ok ? (
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
      ) : (
        <div className="w-2 h-2 rounded-full bg-red-400" />
      )}
    </div>
  );
}
