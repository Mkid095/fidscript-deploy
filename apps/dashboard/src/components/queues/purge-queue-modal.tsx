'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@fidscript/ui';

interface PurgeQueueModalProps {
  queueId: string;
  queueName: string;
  projectId: string;
  onClose: () => void;
  onPurged: () => void;
  getSdk: () => import('@fidscript/sdk').FidscriptSDK;
}

export function PurgeQueueModal({ queueId, queueName, projectId, onClose, onPurged, getSdk }: PurgeQueueModalProps) {
  const [includeDlq, setIncludeDlq] = useState(false);
  const [purging, setPurging] = useState(false);
  const [result, setResult] = useState<{ purged: number; dlqPurged: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurging(true);
    setError(null);
    try {
      const sdk = getSdk();
      const res = await sdk.queues.purge(projectId, queueId, includeDlq);
      setResult(res);
      if (!includeDlq || res.dlqPurged === 0) {
        setTimeout(() => { onPurged(); onClose(); }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purge queue');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--rail)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--rail)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Icon icon="icons8:trash" width={14} height={14} className="text-rose-400" />
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
            <Icon icon="icons8:cancel" width={14} height={14} />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handlePurge} className="p-5 space-y-4">
            <div className="flex items-start gap-3 text-xs text-[var(--text-dim)] bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
              <Icon icon="icons8:exclamation-mark" width={14} height={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
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
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                <Icon icon="icons8:cancel" width={13} height={13} />
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
                className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
              >
                {purging ? 'Purging…' : 'Purge Queue'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Icon icon="icons8:checkmark" width={16} height={16} />
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
