import 'server-only';

import { serverApi as api } from './server';

/**
 * The project's monitoring.
 *
 * The rules that say when to speak up, and the places the word goes.
 */
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  durationSeconds?: number | null;
  severity: 'critical' | 'warning' | 'info';
  channels: string[];
  enabled: boolean;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook';
  config: Record<string, string>;
}

export async function getAlertRules(projectId: string): Promise<AlertRule[]> {
  const response = await api
    .get<{ rules?: AlertRule[] }>(`/projects/${projectId}/monitoring/alerts/rules`)
    .catch(() => ({ rules: [] }));
  return response.rules ?? [];
}

export async function getNotificationChannels(
  projectId: string,
): Promise<NotificationChannel[]> {
  const response = await api
    .get<{ channels?: NotificationChannel[] }>(`/projects/${projectId}/monitoring/channels`)
    .catch(() => ({ channels: [] }));
  return response.channels ?? [];
}
