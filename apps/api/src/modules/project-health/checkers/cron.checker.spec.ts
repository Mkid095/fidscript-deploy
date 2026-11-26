import { CronHealthChecker } from './cron.checker';
import { SCHEDULER_HEARTBEAT_KEY } from '@/modules/scheduler/services/cron-job-scheduler.service';
import type { Project } from '@prisma/client';

const project = { id: 'p1' } as unknown as Project;

function make(jobs: unknown, runs: { lastRun?: unknown; lastSuccess?: unknown }, heartbeat?: string | null, redisUp = true) {
  const prisma: any = {
    cronJob: { findMany: jest.fn().mockResolvedValue(jobs) },
    cronJobRun: {
      findFirst: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(where.status === 'completed' ? runs.lastSuccess : runs.lastRun),
      ),
    },
  };
  const redis: any = {
    ping: jest.fn().mockResolvedValue(redisUp),
    get: jest.fn().mockResolvedValue(heartbeat),
  };
  return { checker: new CronHealthChecker(prisma, redis), prisma, redis };
}

const job = (enabled: boolean) => ({ id: 'j1', enabled });

describe('cron health', () => {
  it('is not configured when the project has no cron jobs', async () => {
    const { checker } = make([], {});
    const h = await checker.check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
  });

  it('is not configured when jobs exist but none of them is enabled', async () => {
    const { checker, redis } = make([job(false)], {});
    const h = await checker.check(project);
    expect(h.state).toBe('not_configured');
    expect(h.reason).toMatch(/none of them is enabled/i);
    expect(redis.ping).not.toHaveBeenCalled(); // nothing scheduled, nothing to watch
  });

  it('is unknown when the heartbeat cannot be read at all — a dead store is not a silent scheduler', async () => {
    const { checker } = make([job(true)], {}, null, false);
    const h = await checker.check(project);
    expect(h.state).toBe('unknown');
    expect(h.reason).toMatch(/could not be read/i);
  });

  it('is unhealthy when the scheduler has not sent a heartbeat', async () => {
    const { checker } = make([job(true)], {}, null);
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/no.*heartbeat|has not sent/i);
  });

  it('is unhealthy when the last heartbeat is older than the staleness threshold', async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { checker } = make([job(true)], {}, stale);
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/last spoke/i);
  });

  it('is healthy when the scheduler is alive and the jobs are finishing', async () => {
    const now = new Date().toISOString();
    const { checker } = make(
      [job(true)],
      { lastRun: { status: 'completed', completedAt: new Date() }, lastSuccess: { completedAt: new Date() } },
      now,
    );
    const h = await checker.check(project);
    expect(h.state).toBe('healthy');
  });

  it('is degraded when the newest run failed and is newer than the last success', async () => {
    const now = new Date().toISOString();
    const { checker } = make(
      [job(true)],
      { lastRun: { status: 'failed', errorMessage: 'boom', completedAt: new Date() } },
      now,
    );
    const h = await checker.check(project);
    expect(h.state).toBe('degraded');
    expect(h.reason).toContain('boom');
  });

  it('stays healthy when an older failure is already superseded by a success', async () => {
    const now = new Date().toISOString();
    const { checker } = make(
      [job(true)],
      {
        lastRun: { status: 'failed', errorMessage: 'old', completedAt: new Date(Date.now() - 7200_000) },
        lastSuccess: { completedAt: new Date(Date.now() - 3600_000) },
      },
      now,
    );
    const h = await checker.check(project);
    expect(h.state).toBe('healthy');
  });

  it('reads the heartbeat from the scheduler’s own key', async () => {
    const { checker, redis } = make([job(true)], {}, new Date().toISOString());
    await checker.check(project);
    expect(redis.get).toHaveBeenCalledWith(SCHEDULER_HEARTBEAT_KEY);
  });
});
