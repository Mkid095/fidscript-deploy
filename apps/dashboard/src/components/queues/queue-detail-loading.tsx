'use client';

export function QueueDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse" />
      <div className="h-24 bg-[var(--surface-2)] rounded-xl animate-pulse" />
      <div className="h-64 bg-[var(--surface-2)] rounded-xl animate-pulse" />
    </div>
  );
}
