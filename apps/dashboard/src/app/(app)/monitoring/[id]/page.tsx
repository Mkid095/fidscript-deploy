'use client';

import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Modal, Spinner } from '@fidscript/ui';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import type { AlertRule, NotificationChannel } from '@/types';

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  critical: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  info: 'bg-[var(--accent)]/10 text-[var(--accent)]',
};

export default function AlertDetailPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ruleId = params.id as string;
  const projectId = searchParams.get('project') ?? '';

  const [rule, setRule] = useState<AlertRule | null>(null);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [evaluations, setEvaluations] = useState<AlertEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!projectId || !ruleId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sdk = getSdk();
        const [ruleData, chData] = await Promise.all([
          sdk.monitoring.getAlertRule(projectId, ruleId),
          sdk.monitoring.listNotificationChannels(projectId),
        ]);
        setRule(ruleData);
        setChannels(chData);
        const evals = await sdk.monitoring.getAlertEvaluations(projectId, ruleId, 10);
        setEvaluations(evals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alert rule');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, ruleId, getSdk]);

  async function handleToggle() {
    if (!rule || !projectId) return;
    setToggling(true);
    try {
      const sdk = getSdk();
      const updated = await sdk.monitoring.updateAlertRule(projectId, ruleId, {
        enabled: !rule.enabled,
      });
      setRule(updated);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!projectId) return;
    setDeleting(true);
    try {
      const sdk = getSdk();
      await sdk.monitoring.deleteAlertRule(projectId, ruleId);
      router.push(`/monitoring?project=${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
      setDeleting(false);
    }
  }

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

  const intervalLabel = (s: number) => {
    if (s >= 60) return `${s / 60}m`;
    return `${s}s`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text)]">{rule.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[rule.severity] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
              {rule.severity}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              rule.enabled ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'
            }`}>
              {rule.enabled ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] font-mono">
            {rule.metric} {rule.condition} {rule.threshold}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={rule.enabled ? 'secondary' : 'primary'}
            size="sm"
            loading={toggling}
            onClick={handleToggle}
          >
            {rule.enabled ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}

      {/* Rule config */}
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
                <span
                  key={cid}
                  className="text-xs px-2 py-1 rounded bg-[var(--rail)] text-[var(--text-muted)] border border-[var(--rail)]"
                >
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
        {evaluations.length === 0 ? (
          <Card className="border border-[var(--rail)]">
            <EmptyState
              title="No evaluations yet"
              description="Evaluations will appear here once the rule starts running."
            />
          </Card>
        ) : (
          <Card className="border border-[var(--rail)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--rail)]">
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Timestamp</th>
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Value</th>
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map(ev => (
                  <tr key={ev.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/30">
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">
                      {ev.value.toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        ev.fired
                          ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                          : 'bg-[var(--success)]/10 text-[var(--success)]'
                      }`}>
                        {ev.fired ? 'FIRE' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Alert Rule" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Are you sure you want to delete <span className="text-[var(--text)] font-medium">{rule.name}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface AlertEvaluation {
  id: string;
  ruleId: string;
  timestamp: string;
  value: number;
  fired: boolean;
  message?: string;
}
