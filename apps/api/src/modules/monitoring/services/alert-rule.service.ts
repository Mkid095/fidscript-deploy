import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AlertRuleService {
  constructor(private prisma: PrismaService) {}

  async createAlertRule(
    projectId: string,
    dto: {
      name: string;
      metric: string;
      condition: string;
      threshold: number;
      durationSeconds?: number;
      severity?: string;
      channels?: string[];
      enabled?: boolean;
    },
  ) {
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

  async updateAlertRule(
    projectId: string,
    ruleId: string,
    dto: {
      name?: string;
      metric?: string;
      condition?: string;
      threshold?: number;
      durationSeconds?: number;
      severity?: string;
      channels?: string[];
      enabled?: boolean;
    },
  ) {
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
        channels: (dto.channels ?? rule.channels) as any,
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
}
