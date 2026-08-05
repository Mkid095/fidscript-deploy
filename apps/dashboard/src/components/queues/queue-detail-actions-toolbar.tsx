'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Share01Icon, Download01Icon, Delete02Icon, CheckmarkCircle01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
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
          <HugeiconsIcon icon={Share01Icon} size={13} />
          Publish
        </Button>
        <Button size="sm" variant="secondary" onClick={onConsume} disabled={consuming} className="gap-1.5">
          <HugeiconsIcon icon={Download01Icon} size={13} />
          {consuming ? 'Consuming…' : 'Consume'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onPurge} className="gap-1.5 text-rose-400 hover:bg-rose-500/10">
          <HugeiconsIcon icon={Delete02Icon} size={13} />
          Purge
        </Button>
      </div>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-dim)]">{selectedCount} selected</span>
          <Button size="sm" variant="secondary" onClick={onAck} disabled={actionLoading} className="gap-1.5">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
            Ack
          </Button>
          <Button size="sm" variant="secondary" onClick={onRetry} disabled={actionLoading} className="gap-1.5">
            <HugeiconsIcon icon={RefreshIcon} size={13} />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
