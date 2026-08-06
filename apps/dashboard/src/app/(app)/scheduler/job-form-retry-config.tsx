'use client';

import { Input } from '@fidscript/ui';

interface RetryConfigProps {
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  onRetryAttemptsChange: (v: number) => void;
  onRetryDelayChange: (v: number) => void;
  onTimeoutChange: (v: number) => void;
}

export function RetryConfig({
  retryAttempts, retryDelay, timeout,
  onRetryAttemptsChange, onRetryDelayChange, onTimeoutChange,
}: RetryConfigProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retries</label>
        <Input type="number" min={0} max={10} value={retryAttempts}
          onChange={e => onRetryAttemptsChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retry delay (s)</label>
        <Input type="number" min={1} max={3600} value={retryDelay}
          onChange={e => onRetryDelayChange(Math.max(1, parseInt(e.target.value) || 60))}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timeout (s)</label>
        <Input type="number" min={1} max={3600} value={timeout}
          onChange={e => onTimeoutChange(Math.max(1, parseInt(e.target.value) || 300))}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
      </div>
    </div>
  );
}