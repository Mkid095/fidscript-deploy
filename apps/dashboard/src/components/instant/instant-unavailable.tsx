'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';

/**
 * Instant is not available on this install.
 *
 * The platform can only provision an Instant app when it holds a superuser
 * token, and that token is optional — a platform-only install never has one.
 * This state says so plainly rather than pretending the app exists.
 */
export function InstantUnavailable() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] flex items-center justify-center mb-4">
        <HugeiconsIcon icon={Alert02Icon} size={24} className="text-[var(--text-dim)]" />
      </div>
      <h3 className="text-sm font-medium text-[var(--text)] mb-1">Instant is not connected</h3>
      <p className="text-xs text-[var(--text-dim)] max-w-md">
        This platform holds no Instant superuser token, so it cannot create apps.
        Connect one and restart the API to give your projects a data plane.
      </p>
      <div className="mt-4 rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] px-3 py-2 text-left">
        <p className="text-[11px] text-[var(--text-dim)] flex items-center gap-1.5">
          <HugeiconsIcon icon={InformationCircleIcon} size={12} />
          <code className="font-mono">echo &apos;per_…&apos; | sudo tee /opt/fidscript-deploy/installer/docker/secrets/instant_superuser_token.txt</code>
        </p>
      </div>
    </div>
  );
}
