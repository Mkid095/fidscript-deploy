'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';

interface QueuesListHeaderProps {
  queueCount: number;
  loading: boolean;
  onNewQueue: () => void;
}

export function QueuesListHeader({ queueCount, loading, onNewQueue }: QueuesListHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">Queues</h1>
        <p className="text-xs text-[var(--text-dim)] mt-0.5">
          {loading ? 'Loading…' : `${queueCount} queue${queueCount !== 1 ? 's' : ''} in this project`}
        </p>
      </div>
      <Button onClick={onNewQueue} size="sm" className="gap-1.5">
        <HugeiconsIcon icon={Add01Icon} size={14} />
        New Queue
      </Button>
    </div>
  );
}
