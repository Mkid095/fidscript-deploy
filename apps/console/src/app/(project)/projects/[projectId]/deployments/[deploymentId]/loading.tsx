import { BarSkeleton, DetailSkeleton } from '@/components/ui/skeleton';

/** While one deployment is loading. */
export default function Loading() {
  return (
    <>
      <BarSkeleton />
      <div className="w-full px-4 py-8 sm:px-6">
        <DetailSkeleton />
      </div>
    </>
  );
}
