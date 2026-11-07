import { Spinner } from '@/components/ui/button';

/** While a sign-in screen is loading. */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-text-muted">
      <Spinner />
      <span className="ml-2 text-sm">Loading…</span>
    </div>
  );
}
