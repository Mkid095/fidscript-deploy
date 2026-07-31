'use client';

import { Icon } from '@iconify/react';
import { Card, Button } from '@fidscript/ui';

interface BucketSettingsPanelProps {
  bucketId: string; projectId: string;
  onClose: () => void; onDeleted: () => void;
  onError: (message: string) => void;
  getSdk: () => { storage: { deleteBucket: Function } };
}

export function BucketSettingsPanel({
  bucketId, projectId, onClose, onDeleted, onError, getSdk,
}: BucketSettingsPanelProps) {
  return (
    <Card className="border border-rose-500/20 bg-rose-500/5" padding="lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-400">Danger Zone</h2>
        <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
          <Icon icon="icons8:cancel" width={14} height={14} />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            if (!confirm(`Delete bucket "${bucketId}" and ALL its files? This cannot be undone.`)) return;
            try {
              await getSdk().storage.deleteBucket(projectId, bucketId);
              onDeleted();
            } catch (err) {
              onError(err instanceof Error ? err.message : 'Delete failed');
            }
          }}
        >
          <Icon icon="icons8:trash" width={13} height={13} className="mr-1.5" />
          Delete Bucket
        </Button>
        <p className="text-[10px] text-[var(--text-dim)]">
          Permanently deletes the bucket and all uploaded files. This cannot be undone.
        </p>
      </div>
    </Card>
  );
}
