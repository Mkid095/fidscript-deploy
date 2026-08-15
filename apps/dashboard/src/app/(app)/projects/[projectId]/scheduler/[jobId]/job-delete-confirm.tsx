'use client';

import { Button } from '@fidscript/ui';
import type { CronJob } from '@/types';

interface Props {
  job: CronJob;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function JobDeleteConfirm({ job, deleting, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--surface-1)] border border-[var(--rail)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Delete &quot;{job.name}&quot;?</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          This will permanently delete the cron job and all its execution history. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
