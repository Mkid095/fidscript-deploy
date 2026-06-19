import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { NotificationService } from './notification.service';

/**
 * Phase 14 — the alert state machine.
 *
 * Replaces the old "fire instantly on the first true sample" logic. On each
 * metric sample, every enabled rule for that metric is evaluated:
 *
 *   condition TRUE  + no open alert      → create PENDING (firstTriggeredAt=now)
 *   condition TRUE  + PENDING held ≥dur  → FIRING (firedAt=now) → dispatch + event
 *   condition FALSE + open alert         → RESOLVED (resolvedAt=now) + event
 *
 * So a brief blip stays PENDING (no notification); only sustained conditions
 * fire, and clearing the condition auto-resolves. (OK→PENDING→FIRING→RESOLVED.)
 */
@Injectable()
export class AlertEvaluatorService {
  private readonly logger = new Logger(AlertEvaluatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    private readonly notifications: NotificationService,
  ) {}

  /** Evaluate every enabled rule attached to this metric sample. */
  async evaluate(projectId: string, metric: string, value: number): Promise<void> {
    const rules = await this.prisma.alertRule.findMany({ where: { projectId, metric, enabled: true } });
    for (const rule of rules) {
      try {
        await this.evaluateRule(rule, value);
      } catch (err: unknown) {
        this.logger.error(`rule ${rule.id} evaluation failed: ${(err as Error).message}`);
      }
    }
  }

  private conditionMet(condition: string, value: number, threshold: number): boolean {
    switch (condition) {
      case 'above': return value > threshold;
      case 'below': return value < threshold;
      case 'equals': return value === threshold;
      default: return false;
    }
  }

  private async evaluateRule(rule: { id: string; projectId: string; name: string; metric: string; condition: string; threshold: number; durationSeconds: number; severity: string; channels: unknown }, value: number): Promise<void> {
    const met = this.conditionMet(rule.condition, value, rule.threshold);
    const open = await this.prisma.alert.findFirst({
      where: { ruleId: rule.id, status: { in: ['pending', 'firing'] } },
    });

    if (met) {
      if (!open) {
        await this.prisma.alert.create({
          data: {
            projectId: rule.projectId, ruleId: rule.id, severity: rule.severity,
            status: 'pending', firstTriggeredAt: new Date(),
            message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
          },
        });
        return;
      }
      if (open.status === 'pending' && open.firstTriggeredAt) {
        const heldMs = Date.now() - open.firstTriggeredAt.getTime();
        if (heldMs >= rule.durationSeconds * 1000) {
          const alert = await this.prisma.alert.update({
            where: { id: open.id }, data: { status: 'firing', firedAt: new Date() },
          });
          await this.eventService.emit('monitoring.alert.firing', {
            projectId: rule.projectId, ruleId: rule.id, alertId: alert.id,
            metric: rule.metric, value, threshold: rule.threshold,
          });
          await this.notifications.dispatchForAlert(alert, rule);
        }
      }
    } else if (open) {
      await this.prisma.alert.update({ where: { id: open.id }, data: { status: 'resolved', resolvedAt: new Date() } });
      await this.eventService.emit('monitoring.alert.resolved', {
        projectId: rule.projectId, ruleId: rule.id, alertId: open.id,
      });
    }
  }
}
