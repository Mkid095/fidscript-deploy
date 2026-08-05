import { useState, useEffect, useCallback } from 'react';
import type { AlertRule, NotificationChannel } from '@/types';
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
  loading: boolean;
  error: string | null;
}

export function useAlertDetail({
  ruleId,
  projectId,
}: UseAlertDetailOptions): UseAlertDetailReturn {
  const { getSdk } = useAuth();
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

  return { rule, channels, evaluations, loading, error };
}
