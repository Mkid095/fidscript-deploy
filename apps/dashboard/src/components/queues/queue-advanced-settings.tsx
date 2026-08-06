'use client';

export interface QueueAdvancedValues {
  retentionDays: number;
  maxMessages: number;
  maxBytes: number;
  replicas: number;
  retryAttempts: number;
  retryDelaySeconds: number;
  deadLetterQueue: string;
}

export const QUEUE_ADVANCED_DEFAULTS: QueueAdvancedValues = {
  retentionDays: 7,
  maxMessages: 100000,
  maxBytes: 1073741824,
  replicas: 1,
  retryAttempts: 3,
  retryDelaySeconds: 60,
  deadLetterQueue: '',
};

interface QueueAdvancedSettingsProps {
  values: QueueAdvancedValues;
  onChange: (next: QueueAdvancedValues) => void;
}

export function QueueAdvancedSettings({ values, onChange }: QueueAdvancedSettingsProps) {
  const set = <K extends keyof QueueAdvancedValues>(key: K, v: QueueAdvancedValues[K]) => {
    onChange({ ...values, [key]: v });
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="queue-retention" className="block text-xs font-medium text-[var(--text-dim)] mb-1">Retention (days)</label>
          <input
            id="queue-retention"
            type="number"
            min={1}
            value={values.retentionDays}
            onChange={(e) => set('retentionDays', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="queue-replicas" className="block text-xs font-medium text-[var(--text-dim)] mb-1">Replicas</label>
          <input
            id="queue-replicas"
            type="number"
            min={1}
            value={values.replicas}
            onChange={(e) => set('replicas', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="queue-max-messages" className="block text-xs font-medium text-[var(--text-dim)] mb-1">Max Messages</label>
          <input
            id="queue-max-messages"
            type="number"
            min={1}
            value={values.maxMessages}
            onChange={(e) => set('maxMessages', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="queue-max-bytes" className="block text-xs font-medium text-[var(--text-dim)] mb-1">Max Bytes</label>
          <input
            id="queue-max-bytes"
            type="number"
            min={1}
            value={values.maxBytes}
            onChange={(e) => set('maxBytes', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="queue-retry-attempts" className="block text-xs font-medium text-[var(--text-dim)] mb-1">Retry Attempts</label>
          <input
            id="queue-retry-attempts"
            type="number"
            min={0}
            value={values.retryAttempts}
            onChange={(e) => set('retryAttempts', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="queue-retry-delay" className="block text-xs font-medium text-[var(--text-dim)] mb-1">Retry Delay (sec)</label>
          <input
            id="queue-retry-delay"
            type="number"
            min={0}
            value={values.retryDelaySeconds}
            onChange={(e) => set('retryDelaySeconds', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="queue-dlq" className="block text-xs font-medium text-[var(--text-dim)] mb-1">Dead-Letter Queue Name</label>
        <input
          id="queue-dlq"
          type="text"
          value={values.deadLetterQueue}
          onChange={(e) => set('deadLetterQueue', e.target.value)}
          placeholder="e.g. email-sender-dlq"
          className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)]/40 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
        />
        <p className="text-[10px] text-[var(--text-dim)] mt-1">Failed messages after Retry Attempts go to this queue.</p>
      </div>
    </div>
  );
}
