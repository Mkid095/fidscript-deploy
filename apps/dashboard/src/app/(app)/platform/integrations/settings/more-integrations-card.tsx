'use client';

import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon } from '@hugeicons/core-free-icons';

export function MoreIntegrationsCard() {
  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={RefreshIcon} size={16} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">More integrations</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">GitHub, Vercel, and more coming soon</p>
        </div>
      </div>
      <p className="text-xs text-[var(--text-dim)]">Additional cloud provider integrations are planned. Open an issue on GitHub to request a specific integration.</p>
    </Card>
  );
}
