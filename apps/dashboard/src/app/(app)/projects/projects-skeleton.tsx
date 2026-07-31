// Skeleton cards for projects loading state

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-5 animate-pulse">
          <div className="h-4 bg-[var(--rail)] rounded w-2/3 mb-2" />
          <div className="h-3 bg-[var(--rail)] rounded w-1/2 mb-4" />
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-16 bg-[var(--rail)] rounded-full" />
            <div className="h-3 w-20 bg-[var(--rail)] rounded" />
          </div>
          <div className="h-3 bg-[var(--rail)] rounded w-full mb-2" />
          <div className="h-3 bg-[var(--rail)] rounded w-4/5 mb-4" />
          <div className="flex items-center justify-between pt-2 border-t border-[var(--rail)]">
            <div className="h-3 w-14 bg-[var(--rail)] rounded" />
            <div className="h-3 w-10 bg-[var(--rail)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
