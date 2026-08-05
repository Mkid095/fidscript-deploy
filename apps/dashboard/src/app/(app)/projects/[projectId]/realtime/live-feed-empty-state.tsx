'use client';

/**
 * LiveFeedEmptyState — context-sensitive "nothing here yet" placeholder.
 *
 * Branches on (status, paused) to pick the most useful copy and icon. Pure
 * presentation: no state, no SDK calls, no scroll behaviour.
 */
import { HugeiconsIcon } from '@hugeicons/react';
import { FlashIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Spinner } from '@fidscript/ui';

import { type LiveFeedStatus } from './live-feed-utils';

interface LiveFeedEmptyStateProps {
  status: LiveFeedStatus;
  paused: boolean;
}

export function LiveFeedEmptyState({ status, paused }: LiveFeedEmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
      {status === 'connecting' ? (
        <>
          <Spinner size="md" />
          <p className="text-xs text-[var(--text-muted)]">Connecting to realtime…</p>
        </>
      ) : status === 'disconnected' ? (
        <>
          <HugeiconsIcon icon={Cancel01Icon} size={22} className="text-rose-400" />
          <p className="text-xs text-[var(--text-muted)]">Couldn&apos;t connect to the realtime socket.</p>
          <p className="text-[11px] text-[var(--text-dim)]">Reload the page to retry.</p>
        </>
      ) : paused ? (
        <p className="text-xs text-[var(--text-muted)]">Stream paused — resume to capture new events.</p>
      ) : (
        <>
          <HugeiconsIcon icon={FlashIcon} size={22} className="text-[var(--text-dim)]" />
          <p className="text-xs text-[var(--text-muted)]">Waiting for events.</p>
          <p className="text-[11px] text-[var(--text-dim)] max-w-xs">
            Trigger a deploy, or mutate a realtime-enabled table — events will stream here in real time.
          </p>
        </>
      )}
    </div>
  );
}
