import { AxiosInstance } from 'axios';

export class MonitoringModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async recordMetric(projectId: string, metric: string, value: number, labels?: Record<string, string>) {
    const response = await this.client.post(`/projects/${projectId}/monitoring/metrics`, { metric, value, labels });
    return response.data;
  }

  async getMetrics(projectId: string, metric?: string, limit = 100) {
    const response = await this.client.get(`/projects/${projectId}/monitoring/metrics`, { params: { metric, limit } });
    return response.data.metrics;
  }

  async getMetricSummary(projectId: string, metric: string, interval = '1h') {
    const response = await this.client.get(`/projects/${projectId}/monitoring/metrics/${metric}/summary`, { params: { interval } });
    return response.data;
  }

  async createAlertRule(projectId: string, data: { name: string; metric: string; condition: string; threshold: number; severity?: string }) {
    const response = await this.client.post(`/projects/${projectId}/monitoring/alerts/rules`, data);
    return response.data;
  }

  async listAlertRules(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/monitoring/alerts/rules`);
    return response.data.rules;
  }

  async getAlerts(projectId: string, status?: string) {
    const response = await this.client.get(`/projects/${projectId}/monitoring/alerts`, { params: { status } });
    return response.data.alerts;
  }

  async acknowledgeAlert(projectId: string, alertId: string) {
    const response = await this.client.post(`/projects/${projectId}/monitoring/alerts/${alertId}/acknowledge`);
    return response.data;
  }

  async resolveAlert(projectId: string, alertId: string) {
    const response = await this.client.post(`/projects/${projectId}/monitoring/alerts/${alertId}/resolve`);
    return response.data;
  }

  async createNotificationChannel(projectId: string, name: string, type: string, config: Record<string, string>) {
    const response = await this.client.post(`/projects/${projectId}/monitoring/channels`, { name, type, config });
    return response.data;
  }

  async getDashboardStats(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/monitoring/stats`);
    return response.data;
  }
}