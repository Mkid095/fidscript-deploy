/**
 * A placeholder for what is loading.
 *
 * A page that is being fetched should look like the page it is becoming —
 * the same shape, the same rhythm — so nothing jumps when the answer
 * arrives.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-surface-3 ${className}`}
    />
  );
}

/** A line of text that is not there yet. */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/** A panel that is not there yet. */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-rail bg-surface p-4 ${className}`}>
      <Skeleton className="h-4 w-1/3" />
      <SkeletonText lines={2} className="mt-3" />
    </div>
  );
}

/** The page that is loading, in the shape it will have. */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
