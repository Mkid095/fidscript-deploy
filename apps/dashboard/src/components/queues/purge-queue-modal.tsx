'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, Cancel01Icon, ExclamationMarkIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { usePurgeQueue } from './purge-queue.use';

interface PurgeQueueModalProps {
  queueId: string;
  queueName: string;
  projectId: string;
  onClose: () => void;
  onPurged: () => void;
  getSdk: () => import('@fidscript-deploy/sdk').FidscriptSDK;
}

export function PurgeQueueModal({ queueId, queueName, projectId, onClose, onPurged, getSdk }: PurgeQueueModalProps) {
  const [includeDlq, setIncludeDlq] = useState(false);
  const { purging, result, error, purge } = usePurgeQueue(projectId, queueId, getSdk);

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await purge(includeDlq);
    if (res && (!includeDlq || res.dlqPurged === 0)) {
      setTimeout(() => { onPurged(); onClose(); }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--rail)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--rail)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--danger)]/10 flex items-center justify-center">
              <HugeiconsIcon icon={Delete02Icon} size={14} className="text-[var(--danger)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">Purge Queue</h2>
              <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{queueName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handlePurge} className="p-5 space-y-4">
            <div className="flex items-start gap-3 text-xs text-[var(--text-dim)] bg-[var(--warning)]/5 border border-[var(--warning)]/15 rounded-lg p-3">
              <HugeiconsIcon icon={ExclamationMarkIcon} size={14} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
              <span>
                Purging will permanently delete all <strong className="text-[var(--text)]">pending</strong> messages from this queue.
                This action cannot be undone.
              </span>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={includeDlq}
                  onChange={(e) => setIncludeDlq(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${includeDlq ? 'bg-[var(--accent)]' : 'bg-[var(--rail)]'}`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${includeDlq ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </div>
              <span className="text-xs text-[var(--text)]">Also purge dead-letter queue</span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-3 py-2">
                <HugeiconsIcon icon={Cancel01Icon} size={13} />
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={purging}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={purging}
                className="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20"
              >
                {purging ? 'Purging…' : 'Purge Queue'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 text-[var(--success)]">
              <div className="w-8 h-8 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">Queue purged successfully</p>
                <p className="text-xs text-[var(--text-dim)]">
                  {result.purged} message{result.purged !== 1 ? 's' : ''} removed
                  {result.dlqPurged > 0 && `, ${result.dlqPurged} from DLQ`}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { onPurged(); onClose(); }}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
