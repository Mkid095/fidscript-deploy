'use client';

import { Icon } from '@iconify/react';

export function QueuesExplanationBanner() {
  return (
    <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon icon="icons8:info" width={16} height={16} className="text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-1">What are Queues?</h3>
          <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-2xl">
            Queues let you reliably handle background tasks like sending emails, processing images, or dispatching notifications.
            Messages are stored durably and delivered to consumers at least once — even if your service restarts.
            Failed messages can be automatically retried or moved to a dead-letter queue for manual inspection.
          </p>
        </div>
      </div>
    </div>
  );
}
