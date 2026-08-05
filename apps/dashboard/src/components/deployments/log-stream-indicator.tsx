'use client';

export function LogStreamIndicator() {
  return (
    <div className="sticky bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-[var(--surface-2)] to-transparent">
      <div className="flex items-center gap-2 text-[10px] text-[var(--accent)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
        Receiving live logs&hellip;
      </div>
    </div>
  );
}
