import { useState, useEffect, useCallback } from 'react';
import type { AlertRule, Alert, NotificationChannel } from '@/types';
import { useAuth } from '@/contexts/auth-context';

interface AlertEvaluation {
  id: string;
  ruleId: string;
  timestamp: string;
  value: number;
  fired: boolean;
  message?: string;
}

interface UseAlertDetailOptions {
  ruleId: string;
  projectId: string;
}

interface UseAlertDetailReturn {
  rule: AlertRule | null;
  channels: NotificationChannel[];
  evaluations: AlertEvaluation[];
  firingAlert: Alert | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAlertDetail({
  ruleId,
  projectId,
}: UseAlertDetailOptions): UseAlertDetailReturn {
  const { getSdk } = useAuth();
  const [rule, setRule] = useState<AlertRule | null>(null);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [evaluations, setEvaluations] = useState<AlertEvaluation[]>([]);
  const [firingAlert, setFiringAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !ruleId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [ruleData, chData, evals, alertsData] = await Promise.all([
        sdk.monitoring.getAlertRule(projectId, ruleId),
        sdk.monitoring.listNotificationChannels(projectId),
        sdk.monitoring.getAlertEvaluations(projectId, ruleId, 10),
        sdk.monitoring.getAlerts(projectId),
      ]);
      setRule(ruleData);
      setChannels(chData);
      setEvaluations(evals);
      const open = alertsData
        .filter((a: Alert) => a.ruleId === ruleId && (a.status === 'firing' || a.status === 'acknowledged'))
        .sort((a: Alert, b: Alert) => (b.firedAt ?? '').localeCompare(a.firedAt ?? ''))[0] ?? null;
      setFiringAlert(open);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert rule');
    } finally {
      setLoading(false);
    }
  }, [projectId, ruleId, getSdk]);

  useEffect(() => { void load(); }, [load]);

  return { rule, channels, evaluations, firingAlert, loading, error, refetch: load };
}
