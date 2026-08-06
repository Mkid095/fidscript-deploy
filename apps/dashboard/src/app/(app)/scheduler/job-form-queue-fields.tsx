'use client';

import { Input } from '@fidscript/ui';
import type { Queue } from '@/types';

interface QueueActionFieldsProps {
  queues: Queue[];
  loadingQueues: boolean;
  queueId: string;
  onQueueIdChange: (v: string) => void;
  body: string;
  onBodyChange: (v: string) => void;
  delaySeconds: number;
  onDelayChange: (v: number) => void;
}

export function QueueActionFields({
  queues, loadingQueues,
  queueId, onQueueIdChange,
  body, onBodyChange,
  delaySeconds, onDelayChange,
}: QueueActionFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Queue</label>
        {loadingQueues ? (
          <p className="text-xs text-[var(--text-muted)] italic py-2">Loading queues…</p>
        ) : queues.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic py-2">No queues in this project yet.</p>
        ) : (
          <select value={queueId} onChange={e => onQueueIdChange(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
            <option value="">Select a queue…</option>
            {queues.map(q => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Message body (JSON)</label>
        <textarea value={body} onChange={e => onBodyChange(e.target.value)}
          placeholder='{"source":"cron"}'
          rows={3}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono text-xs resize-none rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]" />
      </div>
      <div className="max-w-[200px]">
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Delay (seconds, 0 = immediate)</label>
        <Input type="number" min={0} max={86400} value={delaySeconds}
          onChange={e => onDelayChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
      </div>
    </div>
  );
}