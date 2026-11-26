import { Injectable } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import {
  SCHEDULER_HEARTBEAT_KEY,
  SCHEDULER_HEARTBEAT_STALE_MS,
} from '@/modules/scheduler/services/cron-job-scheduler.service';
import { ProjectHealthChecker, ServiceHealth, unknownHealth } from '../types';

/**
 * The cron service, in its two truths: the scheduler that fires the jobs is
 * alive, and the jobs themselves are finishing cleanly.
 *
 * Liveness comes from the scheduler's own heartbeat key — the one Redis TTL
 * the scheduler writes each minute. A missing or stale key is the scheduler
 * going silent (an API that died mid-run, or one that never bootstrapped),
 * which no row in the database would ever say.
 */
@Injectable()
export class CronHealthChecker implements ProjectHealthChecker {
  readonly service = 'cron' as const;
  readonly link = '/monitoring';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async check(project: Project): Promise<ServiceHealth> {
    const jobs = await this.prisma.cronJob.findMany({
      where: { projectId: project.id },
      select: { id: true, enabled: true, name: true, lastRunAt: true },
    });
    if (jobs.length === 0) {
      return this.base('not_configured', 'The project has no cron jobs.');
    }
    const enabled = jobs.filter((j) => j.enabled);
    if (enabled.length === 0) {
      // Jobs exist but are all switched off: nothing is scheduled, and
      // nothing needs the scheduler. Idle is not broken.
      return this.base('not_configured', 'Cron jobs exist but none of them is enabled.');
    }

    // Can we even read the heartbeat? A dead store is a probe failure, not
    // a silent scheduler — the two would be very different fixes.
    if (!(await this.redis.ping())) {
      return unknownHealth(this, "The scheduler's heartbeat could not be read.");
    }
    const beat = await this.redis.get<string>(SCHEDULER_HEARTBEAT_KEY);
    if (!beat) {
      return this.base('unhealthy', 'The scheduler has not sent a heartbeat.', {
        lastFailureAt: new Date(),
      });
    }
    const ageMs = Date.now() - new Date(beat).getTime();
    if (ageMs > SCHEDULER_HEARTBEAT_STALE_MS) {
      return this.base(
        'unhealthy',
        `The scheduler last spoke ${Math.round(ageMs / 60000)} minute(s) ago.`,
        { lastGoodAt: new Date(beat), lastFailureAt: new Date() },
      );
    }

    // The scheduler is alive: are the jobs finishing? The newest verdict
    // wins, and a failure only matters if it is newer than the last success.
    const ids = enabled.map((j) => j.id);
    const [lastRun, lastSuccess] = await Promise.all([
      this.prisma.cronJobRun.findFirst({
        where: { cronJobId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        select: { status: true, errorMessage: true, completedAt: true, createdAt: true },
      }),
      this.prisma.cronJobRun.findFirst({
        where: { cronJobId: { in: ids }, status: 'completed' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
    ]);
    if (lastRun?.status === 'failed' && (!lastSuccess?.completedAt || (lastRun.completedAt ?? lastRun.createdAt) > lastSuccess.completedAt)) {
      const detail = lastRun.errorMessage ? ` (${lastRun.errorMessage.slice(0, 160)})` : '';
      return this.base('degraded', `The most recent cron run failed${detail}.`, {
        lastGoodAt: lastSuccess?.completedAt ?? null,
        lastFailureAt: lastRun.completedAt,
      });
    }
    return this.base('healthy', undefined, {
      lastGoodAt: lastSuccess?.completedAt ?? lastRun?.completedAt ?? null,
    });
  }

  private base(
    state: ServiceHealth['state'],
    reason?: string,
    times?: { lastGoodAt?: Date | null; lastFailureAt?: Date | null },
  ): ServiceHealth {
    return {
      service: this.service,
      configured: state !== 'not_configured',
      state,
      reason,
      lastGoodAt: times?.lastGoodAt ? times.lastGoodAt.toISOString() : null,
      lastFailureAt: times?.lastFailureAt ? times.lastFailureAt.toISOString() : null,
      link: this.link,
    };
  }
}
