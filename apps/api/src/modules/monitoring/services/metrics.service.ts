import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class MetricsService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async getMetrics(projectId: string, dto: { metric?: string; startTime?: Date; endTime?: Date }) {
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

    await this.checkAlertRules(projectId, metric, value);

    return record;
  }

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
}
