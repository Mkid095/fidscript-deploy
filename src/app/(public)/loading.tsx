import { Skeleton } from '@/components/ui/skeleton';

/** While the front door is loading. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-20">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
