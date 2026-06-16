import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventService } from '../events/event.service.js';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  GetMetricsDto,
  GetAlertsDto,
  CreateNotificationChannelDto,
  UpdateNotificationChannelDto,
} from './dto/index.js';

@Injectable()
export class MonitoringService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  // ===== Metrics =====

  async getMetrics(projectId: string, dto: GetMetricsDto) {
    const where: any = { projectId };
    if (dto.metric) where.metric = dto.metric;
    if (dto.startTime || dto.endTime) {
      where.timestamp = {};
      if (dto.startTime) where.timestamp.gte = dto.startTime;
      if (dto.endTime) where.timestamp.lte = dto.endTime;
    }

    const metrics = await this.prisma.metric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    return { metrics };
  }

  async getMetricSummary(projectId: string, metricName: string, interval = '1h') {
    const now = new Date();
    const intervals: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const startTime = new Date(now.getTime() - (intervals[interval] || intervals['1h']));

    const metrics = await this.prisma.metric.findMany({
      where: { projectId, metric: metricName, timestamp: { gte: startTime } },
      orderBy: { timestamp: 'asc' },
    });

    if (metrics.length === 0) {
      return { metric: metricName, interval, datapoints: [], min: 0, max: 0, avg: 0, current: 0 };
    }

    const values = metrics.map((m) => m.value);
    return {
      metric: metricName,
      interval,
      datapoints: metrics.map((m) => ({ timestamp: m.timestamp, value: m.value })),
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      current: values[values.length - 1],
    };
  }

  async recordMetric(projectId: string, metric: string, value: number, labels?: Record<string, string>) {
    const record = await this.prisma.metric.create({
      data: { projectId, metric, value, labels: labels || {} },
    });

    // Check alert rules
    await this.checkAlertRules(projectId, metric, value);

    return record;
  }

  // ===== Alert Rules =====

  async createAlertRule(projectId: string, dto: CreateAlertRuleDto) {
    const rule = await this.prisma.alertRule.create({
      data: {
        projectId,
        name: dto.name,
        metric: dto.metric,
        condition: dto.condition,
        threshold: dto.threshold,
        durationSeconds: dto.durationSeconds || 60,
        severity: dto.severity || 'warning',
        channels: dto.channels || [],
        enabled: dto.enabled ?? true,
      },
    });

    return rule;
  }

  async listAlertRules(projectId: string) {
    return this.prisma.alertRule.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAlertRule(projectId: string, ruleId: string) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, projectId },
    });
    if (!rule) throw new NotFoundException('Alert rule not found');
    return rule;
  }

  async updateAlertRule(projectId: string, ruleId: string, dto: UpdateAlertRuleDto) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, projectId },
    });
    if (!rule) throw new NotFoundException('Alert rule not found');

    return this.prisma.alertRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name ?? rule.name,
        metric: dto.metric ?? rule.metric,
        condition: dto.condition ?? rule.condition,
        threshold: dto.threshold ?? rule.threshold,
        durationSeconds: dto.durationSeconds ?? rule.durationSeconds,
        severity: dto.severity ?? rule.severity,
        channels: dto.channels ?? rule.channels,
        enabled: dto.enabled ?? rule.enabled,
      },
    });
  }

  async deleteAlertRule(projectId: string, ruleId: string) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, projectId },
    });
    if (!rule) throw new NotFoundException('Alert rule not found');

    await this.prisma.alertRule.delete({ where: { id: ruleId } });
    return { deleted: true };
  }

  // ===== Alerts =====

  async getAlerts(projectId: string, dto: GetAlertsDto) {
    const where: any = { projectId };
    if (dto.status) where.status = dto.status;
    if (dto.severity) where.severity = dto.severity;

    return this.prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getAlert(projectId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, projectId },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async acknowledgeAlert(projectId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, projectId },
    });
    if (!alert) throw new NotFoundException('Alert not found');

    return this.prisma.alert.update({
      where: { id: alertId },
      data: { acknowledgedAt: new Date(), status: 'acknowledged' },
    });
  }

  async resolveAlert(projectId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, projectId },
    });
    if (!alert) throw new NotFoundException('Alert not found');

    return this.prisma.alert.update({
      where: { id: alertId },
      data: { resolvedAt: new Date(), status: 'resolved' },
    });
  }

  // ===== Notification Channels =====

  async createNotificationChannel(projectId: string, dto: CreateNotificationChannelDto) {
    return this.prisma.notificationChannel.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        config: dto.config,
      },
    });
  }

  async listNotificationChannels(projectId: string) {
    return this.prisma.notificationChannel.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNotificationChannel(projectId: string, channelId: string) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');
    return channel;
  }

  async updateNotificationChannel(projectId: string, channelId: string, dto: UpdateNotificationChannelDto) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');

    return this.prisma.notificationChannel.update({
      where: { id: channelId },
      data: {
        name: dto.name ?? channel.name,
        config: dto.config ?? channel.config,
      },
    });
  }

  async deleteNotificationChannel(projectId: string, channelId: string) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');

    await this.prisma.notificationChannel.delete({ where: { id: channelId } });
    return { deleted: true };
  }

  // ===== Internal Methods =====

  private async checkAlertRules(projectId: string, metric: string, value: number) {
    const rules = await this.prisma.alertRule.findMany({
      where: { projectId, metric, enabled: true },
    });

    for (const rule of rules) {
      let triggered = false;

      switch (rule.condition) {
        case 'above':
          triggered = value > rule.threshold;
          break;
        case 'below':
          triggered = value < rule.threshold;
          break;
        case 'equals':
          triggered = value === rule.threshold;
          break;
      }

      if (triggered) {
        // Check if there's already a pending/firing alert for this rule
        const existingAlert = await this.prisma.alert.findFirst({
          where: { projectId, ruleId: rule.id, status: { in: ['firing', 'pending'] } },
        });

        if (!existingAlert) {
          await this.prisma.alert.create({
            data: {
              projectId,
              ruleId: rule.id,
              severity: rule.severity,
              status: 'firing',
              message: `${rule.name}: ${metric} is ${value} (threshold: ${rule.threshold})`,
            },
          });

          await this.eventService.emit('monitoring.alert_triggered', {
            projectId,
            ruleId: rule.id,
            metric,
            value,
            threshold: rule.threshold,
          });
        }
      }
    }
  }

  // ===== Dashboard Stats =====

  async getDashboardStats(projectId: string) {
    const [alertCount, metricCount, channelCount] = await Promise.all([
      this.prisma.alert.count({ where: { projectId, status: 'firing' } }),
      this.prisma.metric.count({ where: { projectId } }),
      this.prisma.notificationChannel.count({ where: { projectId } }),
    ]);

    return {
      activeAlerts: alertCount,
      totalMetrics: metricCount,
      notificationChannels: channelCount,
    };
  }
}