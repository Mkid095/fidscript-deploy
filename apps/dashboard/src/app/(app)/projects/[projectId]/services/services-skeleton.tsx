// Services skeleton loading state

import { Card } from '@fidscript/ui';

export function ServicesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="border border-[var(--rail)] overflow-hidden">
          <div className="p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded bg-[var(--rail)]" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-[var(--rail)] rounded w-2/3" />
                <div className="h-3 bg-[var(--rail)] rounded w-1/3" />
              </div>
              <div className="h-5 w-14 bg-[var(--rail)] rounded-full" />
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--rail)]">
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 bg-[var(--rail)] rounded" />
                <div className="h-2 w-12 bg-[var(--rail)] rounded" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
