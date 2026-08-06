import { FidscriptClient } from '../client';
import type { Metric, AlertRule, Alert, NotificationChannel, AlertEvaluation } from './monitoring-types';

export type { Metric, AlertRule, Alert, NotificationChannel, AlertEvaluation } from './monitoring-types';

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

  async getAlertRule(projectId: string, ruleId: string) {
    return this.client.get<AlertRule>(`/api/v1/projects/${projectId}/monitoring/alerts/rules/${ruleId}`);
  }

  async updateAlertRule(
    projectId: string,
    ruleId: string,
    data: Partial<{
      name: string;
      metric: string;
      condition: string;
      threshold: number;
      severity: string;
      durationSeconds: number;
      channels: string[];
      enabled: boolean;
    }>,
  ) {
    return this.client.patch<AlertRule>(`/api/v1/projects/${projectId}/monitoring/alerts/rules/${ruleId}`, data);
  }

  async deleteAlertRule(projectId: string, ruleId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/monitoring/alerts/rules/${ruleId}`);
  }

  // Alert evaluations (history)
  async getAlertEvaluations(projectId: string, ruleId: string, limit = 10) {
    const res = await this.client.get<{ evaluations: AlertEvaluation[] }>(
      `/api/v1/projects/${projectId}/monitoring/alerts/rules/${ruleId}/evaluations`,
      { limit },
    );
    return res.evaluations;
  }

  // Alerts
  async getAlerts(projectId: string, status?: string) {
    const res = await this.client.get<{ alerts: Alert[] }>(
      `/api/v1/projects/${projectId}/monitoring/alerts`,
      { status },
    );
    return res.alerts;
  }

  async acknowledgeAlert(projectId: string, alertId: string): Promise<Alert> {
    return this.client.post<Alert>(`/api/v1/projects/${projectId}/monitoring/alerts/${alertId}/acknowledge`) as Promise<Alert>;
  }

  async resolveAlert(projectId: string, alertId: string): Promise<Alert> {
    return this.client.post<Alert>(`/api/v1/projects/${projectId}/monitoring/alerts/${alertId}/resolve`) as Promise<Alert>;
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

  async getNotificationChannel(projectId: string, channelId: string) {
    return this.client.get<NotificationChannel>(`/api/v1/projects/${projectId}/monitoring/channels/${channelId}`);
  }

  async updateNotificationChannel(
    projectId: string,
    channelId: string,
    data: { name?: string; config?: Record<string, string> },
  ) {
    return this.client.patch<NotificationChannel>(`/api/v1/projects/${projectId}/monitoring/channels/${channelId}`, data);
  }

  async deleteNotificationChannel(projectId: string, channelId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/monitoring/channels/${channelId}`);
  }

  async testNotificationChannel(projectId: string, channelId: string) {
    return this.client.post(`/api/v1/projects/${projectId}/monitoring/channels/${channelId}/test`);
  }
}
