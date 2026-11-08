import { BarSkeleton, ListSkeleton } from '@/components/ui/skeleton';

/** While this settings section is loading. */
export default function Loading() {
  return (
    <>
      <BarSkeleton />
      <div className="w-full space-y-8 px-4 py-8 sm:px-6">
        <ListSkeleton rows={3} />
      </div>
    </>
  );
}
