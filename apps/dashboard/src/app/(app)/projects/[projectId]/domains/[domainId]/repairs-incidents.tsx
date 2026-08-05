'use client';

import type { DomainIncident } from '@fidscript-deploy/sdk';
import { Badge } from '@fidscript/ui';

export function RepairsIncidents({ incidents }: { incidents: DomainIncident[] }) {
  const open = incidents.filter(i => i.status === 'open');
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
        Open Incidents
        {open.length > 0 && <Badge variant="danger" className="ml-2">{open.length}</Badge>}
      </h2>
      {open.length === 0 ? (
        <div className="rounded-lg border border-[var(--rail)] p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">No open incidents — domain is healthy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {open.map(inc => {
            const severityColor =
              inc.severity === 'critical' ? 'border-[var(--danger)]/40 bg-red-950/20' :
              inc.severity === 'warning' ? 'border-yellow-500/40 bg-yellow-950/20' :
              'border-[var(--rail)] bg-[var(--surface)]';
            return (
              <div key={inc.id} className={`rounded-lg border p-4 ${severityColor}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{inc.title}</p>
                    {inc.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{inc.description}</p>
                    )}
                    <p className="text-xs text-[var(--text-dim)] mt-1.5">
                      Opened {new Date(inc.openedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={inc.severity === 'critical' ? 'danger' : inc.severity === 'warning' ? 'info' : 'default'}
                  >
                    {inc.severity}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
