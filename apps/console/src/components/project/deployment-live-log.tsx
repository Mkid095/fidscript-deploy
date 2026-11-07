'use client';

import { useEffect, useRef, useState } from 'react';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';

import { browserApi } from '@/lib/api/browser';

/**
 * The application's own output, while it runs.
 *
 * It is read from the machine that runs it, a moment at a time, and it
 * follows — so the log fills in as the application says things, rather than
 * only after the build is finished.
 */
export function DeploymentLiveLog({
  projectSlug,
  deploymentId,
}: {
  projectSlug: string;
  deploymentId: string;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [following, setFollowing] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      const container = `fidscript-${projectSlug}-${deploymentId}`;
      const response = await browserApi.get<{ lines?: Array<{ line: string }> }>(
        `/system/logs?container=${encodeURIComponent(container)}&limit=200`,
      );
      if (cancelled) return;
      setLines((response.lines ?? []).map((entry) => entry.line).reverse());
    };

    read();
    const timer = setInterval(read, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectSlug, deploymentId]);

  useEffect(() => {
    if (following) bottom.current?.scrollIntoView({ block: 'end' });
  }, [lines, following]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-rail px-4 py-2">
        <p className="text-xs font-medium text-text-muted">The application&apos;s own log</p>
        <button
          type="button"
          onClick={() => setFollowing(!following)}
          className="text-[11px] text-text-dim transition-colors hover:text-text"
        >
          {following ? 'Following' : 'Following — click to stop'}
        </button>
      </div>

      {lines.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          body="What the application writes appears here as it writes it."
        />
      ) : (
        <div className="max-h-96 overflow-y-auto px-4 py-3">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text-muted">
            {lines.join('\n')}
          </pre>
          <div ref={bottom} />
        </div>
      )}
    </Card>
  );
}
