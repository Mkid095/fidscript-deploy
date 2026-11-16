import {
  BarSkeleton,
  SkeletonCard,
  SkeletonText,
} from '@/components/ui/skeleton';

/** While the machine's page is loading. */
export default function Loading() {
  return (
    <>
      <BarSkeleton />
      <div className="w-full space-y-8 px-4 py-8 sm:px-6">
        <SkeletonCard />
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="rounded-lg border border-rail bg-surface-2 p-4">
          <SkeletonText lines={6} />
        </div>
      </div>
    </>
  );
}
