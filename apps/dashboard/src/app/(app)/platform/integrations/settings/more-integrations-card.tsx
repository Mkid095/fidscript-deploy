'use client';

import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, Tick02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

export function MoreIntegrationsCard() {
  const items: { name: string; status: 'available' | 'planned' }[] = [
    { name: 'GitHub', status: 'available' },
    { name: 'AWS S3 / R2 / GCS', status: 'planned' },
    { name: 'SES / SendGrid / Mailgun', status: 'planned' },
    { name: 'PagerDuty', status: 'planned' },
    { name: 'Vercel', status: 'planned' },
  ];

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={GithubIcon} size={16} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Integrations</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">GitHub is wired. More coming soon.</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map(it => (
          <li key={it.name} className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">{it.name}</span>
            {it.status === 'available' ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <HugeiconsIcon icon={Tick02Icon} size={11} /> Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--text-dim)]">
                <HugeiconsIcon icon={Cancel01Icon} size={11} /> Planned
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--text-dim)] mt-3">Request a specific integration by opening an issue on GitHub.</p>
    </Card>
  );
}
