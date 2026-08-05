'use client';

import { Icon } from '@iconify/react';
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
        <Icon icon="icons8:plus" width={14} height={14} />
        New Queue
      </Button>
    </div>
  );
}
