import { CronJobSchedulerService, SCHEDULER_HEARTBEAT_KEY } from './cron-job-scheduler.service';

/**
 * The scheduler's liveness signal: one TTL key in Redis, written on bootstrap
 * and every minute after. Read by the project-health report; nothing else.
 */

function makeService(jobs: unknown[] = []) {
  const prisma: any = { cronJob: { findMany: jest.fn().mockResolvedValue(jobs) } };
  const redis: any = {
    set: jest.fn().mockResolvedValue(undefined),
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
  };
  const events: any = { emit: jest.fn() };
  const queue: any = {};
  const service = new CronJobSchedulerService(queue, redis, prisma, events);
  return { service, redis, prisma };
}

describe('the scheduler heartbeat', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
  });

  it('writes the heartbeat on bootstrap, even when no job is enabled', async () => {
    const { service, redis } = makeService([]);
    await service.onApplicationBootstrap();

    expect(redis.set).toHaveBeenCalledWith(SCHEDULER_HEARTBEAT_KEY, expect.any(String), 300);
    const value = redis.set.mock.calls[0][1];
    expect(new Date(value).getTime()).not.toBeNaN();
  });

  it('keeps writing it every minute while the scheduler lives', async () => {
    const { service, redis } = makeService([]);
    await service.onApplicationBootstrap();
    redis.set.mockClear();

    jest.advanceTimersByTime(60_000);
    jest.advanceTimersByTime(60_000);

    expect(redis.set).toHaveBeenCalledTimes(2);
    for (const call of redis.set.mock.calls) {
      expect(call[0]).toBe(SCHEDULER_HEARTBEAT_KEY);
      expect(call[2]).toBe(300);
    }
  });

  it('stops writing it when the module is destroyed', async () => {
    const { service, redis } = makeService([]);
    await service.onApplicationBootstrap();
    service.onModuleDestroy();
    redis.set.mockClear();

    jest.advanceTimersByTime(5 * 60_000);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('still bootstraps jobs when Redis is down — the heartbeat is not the scheduler', async () => {
    const job = { id: 'j1', cronExpression: '0 0 * * *', timezone: 'UTC', enabled: true };
    const prisma: any = { cronJob: { findMany: jest.fn().mockResolvedValue([job]) } };
    const redis: any = { set: jest.fn().mockRejectedValue(new Error('redis down')), acquireLock: jest.fn(), releaseLock: jest.fn() };
    const service = new CronJobSchedulerService({} as any, redis, prisma, { emit: jest.fn() } as any);

    await service.onApplicationBootstrap();
    // The job is scheduled in-process regardless of the failed heartbeat:
    // a dead store must not stop the schedules.
    expect((service as any).runningJobs.get('j1')).toBeDefined();
    expect(redis.set).toHaveBeenCalled();
  });
});
