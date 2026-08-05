'use client';

import type { DomainVerificationRun } from '@fidscript-deploy/sdk';
import { Card } from '@fidscript/ui';

export function RepairsHistory({ history }: { history: DomainVerificationRun[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Verification History</h2>
      <Card className="border border-[var(--rail)]" padding="none">
        {history.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">No verification history yet.</p>
          </div>
        ) : (
          <div className="px-4">
            {history.slice(0, 10).map(run => {
              const improved = run.newStatus === 'HEALTHY' || run.newStatus === 'DEGRADED';
              const degraded = run.newStatus === 'FAILED' ||
                (run.previousStatus === 'HEALTHY' && run.newStatus === 'DEGRADED');
              const arrow = improved ? '↑' : degraded ? '↓' : '→';
              const arrowColor = improved
                ? 'text-[var(--success)]' : degraded ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]';
              const scoreColor =
                run.newScore !== null && run.newScore >= 80 ? 'text-[var(--success)]' :
                run.newScore !== null && run.newScore < 60 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]';
              return (
                <div key={run.id} className="flex items-center justify-between py-3 border-b border-[var(--rail)] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${arrowColor}`}>{arrow}</span>
                    <div>
                      <p className="text-sm text-[var(--text)] capitalize">{run.reason.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-[var(--text-dim)]">{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    {run.previousScore !== null && <span>{run.previousScore} → </span>}
                    <span className={scoreColor}>{run.newScore ?? '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
