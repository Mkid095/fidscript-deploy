import { Skeleton } from '@/components/ui/skeleton';

/** While the setup wizard is loading. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
