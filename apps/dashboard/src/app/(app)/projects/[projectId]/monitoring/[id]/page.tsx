'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAlertDetail } from '@/app/(app)/monitoring/[id]/page-hooks';
import { AlertRuleConfig } from '@/app/(app)/monitoring/[id]/alert-rule-config';
import { AlertChannels } from '@/app/(app)/monitoring/[id]/alert-channels';
import { AlertHistory } from '@/app/(app)/monitoring/[id]/alert-history';
import { AlertActions } from '@/app/(app)/monitoring/[id]/alert-actions';
import type { Alert, AlertRule } from '@/types';

export default function ProjectAlertDetailPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const ruleId = params.id as string;
  const projectId = params.projectId as string;
  const [actionError, setActionError] = useState<string | null>(null);

  const { rule, channels, evaluations, firingAlert, loading, error, refetch } =
    useAlertDetail({ ruleId, projectId });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !rule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => history.back()}>
          Go back
        </Button>
      </div>
    );
  }

  if (!rule) return null;

  function handleToggle(_updated: AlertRule) {
    void refetch();
  }

  function handleAlertUpdated(_updated: Alert) {
    void refetch();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text)]">{rule.name}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                rule.severity === 'critical'
                  ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                  : rule.severity === 'warning'
                    ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                    : 'bg-[var(--accent)]/10 text-[var(--accent)]'
              }`}
            >
              {rule.severity}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                rule.enabled
                  ? 'bg-[var(--success)]/10 text-[var(--success)]'
                  : 'bg-[var(--rail)] text-[var(--text-muted)]'
              }`}
            >
              {rule.enabled ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] font-mono">
            {rule.metric} {rule.condition} {rule.threshold}
          </p>
        </div>
        <AlertActions
          rule={rule}
          projectId={projectId}
          firingAlert={firingAlert ?? undefined}
          getSdk={getSdk}
          onToggle={handleToggle}
          onAlertUpdated={handleAlertUpdated}
          onError={setActionError}
        />
      </div>

      {(error || actionError) && (
        <p className="text-[var(--danger)] text-sm mb-4">{actionError ?? error}</p>
      )}
      <AlertRuleConfig rule={rule} />
      <AlertChannels channels={rule.channels} allChannels={channels} />
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
          Recent Evaluations
        </h2>
        <AlertHistory evaluations={evaluations} />
      </div>
    </div>
  );
}
