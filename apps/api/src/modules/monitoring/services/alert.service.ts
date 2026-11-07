import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AlertService {
  constructor(private prisma: PrismaService) {}

  async getAlerts(projectId: string, dto: { status?: string; severity?: string }) {
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
}
