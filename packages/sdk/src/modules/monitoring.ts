import { FidscriptClient } from '../client';

export interface Metric {
  id: string;
  metric: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  durationSeconds: number;
  severity: string;
  channels: string[];
  enabled: boolean;
}

export interface Alert {
  id: string;
  severity: string;
  status: 'pending' | 'firing' | 'resolved';
  message: string;
  firstTriggeredAt?: string;
  firedAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, string>;
}

export class MonitoringModule {
  constructor(private client: FidscriptClient) {}

  // Metrics
  async recordMetric(projectId: string, metric: string, value: number, labels?: Record<string, string>) {
    return this.client.post(`/api/v1/projects/${projectId}/monitoring/metrics`, { metric, value, labels });
  }

  async getMetrics(projectId: string, metric?: string, limit = 100) {
    const res = await this.client.get<{ metrics: Metric[] }>(
      `/api/v1/projects/${projectId}/monitoring/metrics`,
      { metric, limit },
    );
    return res.metrics;
  }

  // Alert Rules
  async createAlertRule(
    projectId: string,
    data: {
      name: string;
      metric: string;
      condition: string;
      threshold: number;
      severity?: string;
      durationSeconds?: number;
      channels?: string[];
    },
  ) {
    return this.client.post<AlertRule>(`/api/v1/projects/${projectId}/monitoring/alerts/rules`, data);
  }

  async listAlertRules(projectId: string) {
    const res = await this.client.get<{ rules: AlertRule[] }>(
      `/api/v1/projects/${projectId}/monitoring/alerts/rules`,
    );
    return res.rules;
  }

  // Alerts
  async getAlerts(projectId: string, status?: string) {
    const res = await this.client.get<{ alerts: Alert[] }>(
      `/api/v1/projects/${projectId}/monitoring/alerts`,
      { status },
    );
    return res.alerts;
  }

  async acknowledgeAlert(projectId: string, alertId: string) {
    return this.client.post(`/api/v1/projects/${projectId}/monitoring/alerts/${alertId}/acknowledge`);
  }

  async resolveAlert(projectId: string, alertId: string) {
    return this.client.post(`/api/v1/projects/${projectId}/monitoring/alerts/${alertId}/resolve`);
  }

  // Notification Channels
  async createNotificationChannel(projectId: string, name: string, type: string, config: Record<string, string>) {
    return this.client.post<NotificationChannel>(`/api/v1/projects/${projectId}/monitoring/channels`, {
      name,
      type,
      config,
    });
  }

  async listNotificationChannels(projectId: string) {
    const res = await this.client.get<{ channels: NotificationChannel[] }>(
      `/api/v1/projects/${projectId}/monitoring/channels`,
    );
    return res.channels;
  }

  async testNotificationChannel(projectId: string, channelId: string) {
    return this.client.post(`/api/v1/projects/${projectId}/monitoring/channels/${channelId}/test`);
  }
}
