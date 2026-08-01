// Load error banner component

import { HugeiconsIcon } from '@hugeicons/react';
import { Time01Icon } from '@hugeicons/core-free-icons';

interface LoadErrorBannerProps {
  message: string;
  countdown: number | null;
  onRetry: () => void;
}

export function LoadErrorBanner({ message, countdown, onRetry }: LoadErrorBannerProps) {
  return (
    <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-3 mb-4 text-sm text-[var(--danger)] flex items-center justify-between">
      <span className="flex items-center gap-2">
        {countdown !== null && (
          <HugeiconsIcon icon={Time01Icon} size={14} className="text-[var(--warning)] flex-shrink-0" />
        )}
        {message}
      </span>
      {countdown === null && (
        <button onClick={onRetry} className="text-xs text-[var(--danger)] hover:text-[var(--text)] underline">
          Retry
        </button>
      )}
    </div>
  );
}
