import { Brand } from '@/components/brand/brand';
import { Spinner } from '@/components/ui/button';

/** While a sign-in screen is loading. */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-text-muted">
      <Brand />
      <div className="flex items-center">
        <Spinner />
        <span className="ml-2 text-sm">Loading…</span>
      </div>
    </div>
  );
}
