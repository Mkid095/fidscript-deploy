import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

/**
 * RetentionPolicyService — enforces email retention policies on a daily schedule.
 *
 * Policies are evaluated in priority order (highest first). For each policy:
 *   1. Query messages matching the scope (project / mailbox / domain) older than the rule threshold
 *   2. Apply action: archive (set archivedAt) or delete (hard delete)
 *   3. Mark processed messages with retentionAppliedAt to avoid re-processing
 *   4. Emit email.message.archived / email.message.purged events
 *
 * Runs daily at 02:00 UTC via setInterval (same pattern as LogSchedulerService).
 */
@Injectable()
export class RetentionPolicyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionPolicyService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  onModuleInit() {
    // Run once at startup, then every 24 hours
    this.runRetentionSweep().catch(err =>
      this.logger.error(`retention sweep error: ${(err as Error).message}`),
    );
    this.timer = setInterval(() => {
      this.runRetentionSweep().catch(err =>
        this.logger.error(`retention sweep error: ${(err as Error).message}`),
      );
    }, 24 * 60 * 60 * 1_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runRetentionSweep(): Promise<void> {
    this.logger.log('Starting retention sweep');

    const policies = await this.prisma.emailRetentionPolicy.findMany({
      orderBy: { priority: 'desc' },
    });

    for (const policy of policies) {
      await this.processPolicy(policy).catch(err =>
        this.logger.error(`policy=${policy.name} error: ${(err as Error).message}`),
      );
    }

    this.logger.log('Retention sweep complete');
  }

  private async processPolicy(policy: { id: string; scope: string; scopeId: string | null; projectId: string; rules: unknown; name: string }): Promise<void> {
    const rules = (policy.rules as Array<{ type: string; value: string; action: string }>) ?? [];
    if (!rules.length) return;

    // Build date thresholds from rules
    const now = new Date();
    const thresholds = rules.map(rule => {
      const ms = this.parseDuration(rule.value);
      return { rule, cutoff: new Date(now.getTime() - ms) };
    });

    // Determine scope query
    const messageWhere: Record<string, unknown> = {
      archivedAt: null,
      retentionAppliedAt: null,
    };

    if (policy.scope === 'mailbox' && policy.scopeId) {
      messageWhere.mailboxId = policy.scopeId;
    } else if (policy.scope === 'domain' && policy.scopeId) {
      const domain = await this.prisma.emailDomain.findFirst({ where: { id: policy.scopeId }, include: { mailboxes: { select: { id: true } } } });
      if (domain) messageWhere.mailboxId = { in: domain.mailboxes.map(m => m.id) };
    } else {
      // project or global — restrict to project's domains
      messageWhere.projectId = policy.projectId;
    }

    // Process each rule
    for (const { rule, cutoff } of thresholds) {
      // Find messages older than cutoff that haven't been retention-applied
      const messages = await this.prisma.emailMessage.findMany({
        where: { ...messageWhere, createdAt: { lt: cutoff }, retentionAppliedAt: null },
        take: 500, // process in batches
        orderBy: { createdAt: 'asc' },
      });

      if (!messages.length) continue;

      const messageIds = messages.map(m => m.id);

      if (rule.action === 'delete') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.prisma.emailMessage.updateMany({
          where: { id: { in: messageIds } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { retentionAppliedAt: new Date() } as any,
        });
        await this.prisma.emailMessage.deleteMany({ where: { id: { in: messageIds } } });
        for (const msg of messages) {
          await this.events.emit('email.message.purged', msg.projectId, { messageId: msg.id }, {});
        }
        this.logger.log(`policy=${policy.name} purged=${messageIds.length} messages`);
      } else if (rule.action === 'archive') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.prisma.emailMessage.updateMany({
          where: { id: { in: messageIds } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { archivedAt: new Date(), retentionAppliedAt: new Date() } as any,
        });
        for (const msg of messages) {
          await this.events.emit('email.message.archived', msg.projectId, { messageId: msg.id }, {});
        }
        this.logger.log(`policy=${policy.name} archived=${messageIds.length} messages`);
      }
    }
  }

  private parseDuration(value: string): number {
    const match = value.match(/^(\d+)([dhm])$/);
    if (!match) return 0;
    const num = parseInt(match[1], 10);
    switch (match[2]) {
      case 'd': return num * 86_400_000;
      case 'h': return num * 3_600_000;
      case 'm': return num * 60_000;
      default: return 0;
    }
  }
}
