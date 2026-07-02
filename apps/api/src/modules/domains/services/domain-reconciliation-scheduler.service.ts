import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import { EventService } from '@/modules/events/event.service';
import { DomainReconciliationQueueService } from './domain-reconciliation-queue.service';
import { DomainReconciliationService } from './domain-reconciliation.service';
import { DomainHealthStatus } from '@prisma/client';

const SCHEDULER_LOCK_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class DomainReconciliationScheduler implements OnModuleInit {
  private readonly logger = new Logger(DomainReconciliationScheduler.name);

  // SSL expiry thresholds in days — order matters (most urgent first)
  private readonly SSL_EXPIRY_THRESHOLDS = [30, 14, 7, 3, 1];

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private eventService: EventService,
    private queueService: DomainReconciliationQueueService,
    private reconciliation: DomainReconciliationService,
  ) {}

  async onModuleInit() {
    // Verification cycle: every 1 minute
    setInterval(async () => {
      try {
        await this.runVerificationCycle();
      } catch (err) {
        this.logger.error(`[domain-recon-scheduler] cycle error: ${err instanceof Error ? err.message : err}`);
      }
    }, 60_000);

    // SSL expiry monitor: every 6 hours
    setInterval(async () => {
      try {
        await this.runSslExpiryChecks();
      } catch (err) {
        this.logger.error(`[domain-recon] SSL expiry check error: ${err instanceof Error ? err.message : err}`);
      }
    }, 6 * 60 * 60 * 1000);

    this.logger.log('DomainReconciliationScheduler initialised');
  }

  // ── Cron trigger — runs every minute ────────────────────────────────────────

  /**
   * Called by the application-level cron (or a NestJS @Cron decorator).
   * Finds all domains whose nextVerificationAt is due and enqueues them.
   */
  async runVerificationCycle() {
    const lockKey = 'domain-recon:scheduler:lock';
    const lockToken = crypto.randomUUID();
    const acquired = await this.redis.acquireLock(lockKey, lockToken, SCHEDULER_LOCK_TTL);
    if (!acquired) {
      this.logger.debug('[domain-recon-scheduler] lock not acquired, skipping cycle');
      return;
    }

    try {
      const now = new Date();

      // 1. Pick up due domains
      const dueDomains = await this.prisma.domain.findMany({
        where: {
          OR: [
            { nextVerificationAt: { lte: now } },
            // Never checked: healthStatus is PENDING and nextVerificationAt is null
            { healthStatus: DomainHealthStatus.PENDING, nextVerificationAt: null },
          ],
        },
        select: { id: true, domain: true, healthStatus: true },
      });

      if (dueDomains.length > 0) {
        this.logger.log(`[domain-recon-scheduler] enqueuing ${dueDomains.length} domains`);
        await Promise.allSettled(
          dueDomains.map(d => this.queueService.enqueue(d.id, 'scheduled')),
        );
      }

      // 2. SSL expiry monitoring
      await this.runSslExpiryChecks();

    } finally {
      await this.redis.releaseLock(lockKey, lockToken);
    }
  }

  // ── SSL expiry monitoring ────────────────────────────────────────────────────

  private async runSslExpiryChecks() {
    const expiring = await this.reconciliation.getSslExpiringDomains(this.SSL_EXPIRY_THRESHOLDS);
    for (const domain of expiring) {
      const daysLeft = Math.ceil(
        (domain.sslExpiresAt!.getTime() - Date.now()) / 86_400_000,
      );
      this.eventService.emit(
        'domains.ssl.expiring' as any,
        domain.projectId,
        {
          domainId: domain.id,
          domain: domain.domain,
          daysLeft,
          expiresAt: domain.sslExpiresAt!.toISOString(),
        },
        { actorType: 'system', resourceType: 'domain', resourceId: domain.id },
      );
      this.logger.log(
        `[domain-recon] SSL expiry alert: ${domain.domain} expires in ${daysLeft} days`,
      );
    }
  }

  // ── Immediate enqueue helpers (for manual/triggered rechecks) ─────────────────

  /**
   * Enqueue a domain immediately for reconciliation (used by manual triggers or
   * event-driven calls from other services, e.g. DNS change webhook).
   */
  async enqueueImmediate(domainId: string, reason: 'manual' | 'dns_change' | 'ssl_expiry') {
    await this.queueService.enqueue(domainId, reason);
    this.logger.debug(`[domain-recon-scheduler] immediate enqueue domainId=${domainId} reason=${reason}`);
  }
}
