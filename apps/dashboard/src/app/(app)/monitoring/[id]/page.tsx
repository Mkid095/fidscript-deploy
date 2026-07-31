'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button, Card, Spinner } from '@fidscript/ui';
import type { AlertRule, NotificationChannel } from '@/types';

import { useAuth } from '@/contexts/auth-context';
import { AlertHistory } from './alert-history';
import { AlertActions } from './alert-actions';

interface AlertEvaluation {
  id: string;
  ruleId: string;
  timestamp: string;
  value: number;
  fired: boolean;
  message?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  critical: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  info: 'bg-[var(--accent)]/10 text-[var(--accent)]',
};

export default function AlertDetailPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const ruleId = params.id as string;
  const projectId = searchParams.get('project') ?? '';

  const [rule, setRule] = useState<AlertRule | null>(null);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [evaluations, setEvaluations] = useState<AlertEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !ruleId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const [ruleData, chData, evals] = await Promise.all([
          sdk.monitoring.getAlertRule(projectId, ruleId),
          sdk.monitoring.listNotificationChannels(projectId),
          sdk.monitoring.getAlertEvaluations(projectId, ruleId, 10),
        ]);
        setRule(ruleData);
        setChannels(chData);
        setEvaluations(evals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alert rule');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, ruleId, getSdk]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>;
  }

  if (error && !rule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => history.back()}>Go back</Button>
      </div>
    );
  }

  if (!rule) return null;

  const intervalLabel = (s: number) => s >= 60 ? `${s / 60}m` : `${s}s`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text)]">{rule.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
              {rule.severity}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${rule.enabled ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
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
          getSdk={getSdk}
          onToggle={setRule}
          onError={setError}
        />
      </div>

      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}

      {/* Rule config grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border border-[var(--rail)]" padding="md">
          <p className="text-xs text-[var(--text-muted)] mb-1">Metric</p>
          <p className="text-sm font-mono text-[var(--text)]">{rule.metric}</p>
        </Card>
        <Card className="border border-[var(--rail)]" padding="md">
          <p className="text-xs text-[var(--text-muted)] mb-1">Condition</p>
          <p className="text-sm text-[var(--text)]">{rule.condition} {rule.threshold}</p>
        </Card>
        <Card className="border border-[var(--rail)]" padding="md">
          <p className="text-xs text-[var(--text-muted)] mb-1">Interval</p>
          <p className="text-sm text-[var(--text)]">{intervalLabel(rule.durationSeconds)}</p>
        </Card>
        <Card className="border border-[var(--rail)]" padding="md">
          <p className="text-xs text-[var(--text-muted)] mb-1">Severity</p>
          <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
            {rule.severity}
          </span>
        </Card>
      </div>

      {/* Notification channels */}
      {rule.channels.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Notification Channels</h2>
          <div className="flex flex-wrap gap-2">
            {rule.channels.map(cid => {
              const ch = channels.find(c => c.id === cid);
              return (
                <span key={cid} className="text-xs px-2 py-1 rounded bg-[var(--rail)] text-[var(--text-muted)] border border-[var(--rail)]">
                  {ch ? `${ch.name} (${ch.type})` : cid}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Evaluation history */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Recent Evaluations</h2>
        <AlertHistory evaluations={evaluations} />
      </div>
    </div>
  );
}
