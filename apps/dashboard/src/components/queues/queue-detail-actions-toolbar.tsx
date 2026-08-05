'use client';

import { Icon } from '@iconify/react';
import { Button } from '@fidscript/ui';

interface QueueDetailActionsToolbarProps {
  selectedCount: number;
  consuming: boolean;
  actionLoading: boolean;
  onPublish: () => void;
  onConsume: () => void;
  onPurge: () => void;
  onAck: () => void;
  onRetry: () => void;
}

export function QueueDetailActionsToolbar({
  selectedCount,
  consuming,
  actionLoading,
  onPublish,
  onConsume,
  onPurge,
  onAck,
  onRetry,
}: QueueDetailActionsToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onPublish} className="gap-1.5">
          <Icon icon="icons8:share" width={13} height={13} />
          Publish
        </Button>
        <Button size="sm" variant="secondary" onClick={onConsume} disabled={consuming} className="gap-1.5">
          <Icon icon="icons8:download" width={13} height={13} />
          {consuming ? 'Consuming…' : 'Consume'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onPurge} className="gap-1.5 text-rose-400 hover:bg-rose-500/10">
          <Icon icon="icons8:trash" width={13} height={13} />
          Purge
        </Button>
      </div>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-dim)]">{selectedCount} selected</span>
          <Button size="sm" variant="secondary" onClick={onAck} disabled={actionLoading} className="gap-1.5">
            <Icon icon="icons8:checkmark" width={13} height={13} />
            Ack
          </Button>
          <Button size="sm" variant="secondary" onClick={onRetry} disabled={actionLoading} className="gap-1.5">
            <Icon icon="icons8:refresh" width={13} height={13} />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
