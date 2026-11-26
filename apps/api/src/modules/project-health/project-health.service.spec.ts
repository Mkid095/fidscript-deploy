import { ProjectHealthService } from './project-health.service';
import { NotFoundException } from '@nestjs/common';
import { Project } from '@prisma/client';

/**
 * The orchestrator's promises: a warm report costs nothing, a checker that
 * dies is reported as unknown — never healthy — and the serialized report
 * carries no credentials, ever.
 */

function makeService({
  project,
  redis,
  checkers,
}: {
  project: Project | null;
  redis: any;
  checkers: any[];
}) {
  const prisma: any = { project: { findUnique: jest.fn().mockResolvedValue(project) } };
  // Eight fixed checker slots: deployment, database, instantdb, domains,
  // email, cron, functions, storage — in the order the constructor wants.
  return new ProjectHealthService(
    prisma,
    redis,
    checkers[0],
    checkers[1],
    checkers[2],
    checkers[3],
    checkers[4],
    checkers[5],
    checkers[6],
    checkers[7],
  );
}

function fakeCheckers(states: Array<{ state: string; service: string }>) {
  return states.map(({ state, service }) => ({
    service,
    link: `/${service}`,
    check: jest.fn().mockResolvedValue({
      service,
      configured: state !== 'not_configured',
      state,
      link: `/${service}`,
    }),
  }));
}

const allEight = (): Array<{ state: string; service: string }> => [
  { state: 'healthy', service: 'deployment' },
  { state: 'healthy', service: 'database' },
  { state: 'not_configured', service: 'instantdb' },
  { state: 'not_configured', service: 'domains' },
  { state: 'not_configured', service: 'email' },
  { state: 'not_configured', service: 'cron' },
  { state: 'not_configured', service: 'functions' },
  { state: 'healthy', service: 'storage' },
];

describe('project health', () => {
  it('rolls a project of healthy + not-configured services up to healthy', async () => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = makeService({
      project: { id: 'p1', slug: 'x' } as Project,
      redis,
      checkers: fakeCheckers(allEight()),
    });
    const report = await service.evaluate('p1');
    expect(report.overall).toBe('healthy');
    expect(report.services).toHaveLength(8);
    expect(redis.set).toHaveBeenCalledWith('project-health:p1', expect.anything(), 60);
  });

  it('answers a warm call from the cache and runs zero checks', async () => {
    const checkers = fakeCheckers(allEight());
    const cachedEntry = (c: any) => ({
      service: c.service,
      configured: c.state !== 'not_configured',
      state: c.state,
      link: c.link,
    });
    const redis = {
      get: jest.fn().mockResolvedValue({
        projectId: 'p1',
        checkedAt: new Date().toISOString(),
        overall: 'healthy',
        services: checkers.map(cachedEntry),
      }),
      set: jest.fn(),
    };
    const service = makeService({ project: null, redis, checkers });
    const report = await service.evaluate('p1');
    expect(report.overall).toBe('healthy');
    for (const c of checkers) {
      expect(c.check).not.toHaveBeenCalled();
    }
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('rejects a stale cache whose shape no longer matches, and bypasses a valid one when asked', async () => {
    const checkers = fakeCheckers(allEight());
    const cachedEntry = (c: any) => ({
      service: c.service,
      configured: c.state !== 'not_configured',
      state: c.state,
      link: c.link,
    });
    const redis = {
      // First call: a cache written by an older build with only six services.
      get: jest
        .fn()
        .mockResolvedValueOnce({
          projectId: 'p1',
          checkedAt: new Date().toISOString(),
          overall: 'healthy',
          services: checkers.slice(0, 6).map(cachedEntry),
        })
        // Second call: a valid warm cache.
        .mockResolvedValueOnce({
          projectId: 'p1',
          checkedAt: new Date().toISOString(),
          overall: 'healthy',
          services: checkers.map(cachedEntry),
        }),
      set: jest.fn(),
    };
    const service = makeService({
      project: { id: 'p1', slug: 'x' } as Project,
      redis,
      checkers,
    });
    await service.evaluate('p1');
    // The six-entry cache was rejected: all eight checkers ran.
    expect(checkers[0].check).toHaveBeenCalledTimes(1);

    // ?refresh=true bypasses even a valid cache.
    await service.evaluate('p1', { force: true });
    expect(checkers[0].check).toHaveBeenCalledTimes(2);
  });

  it('reports a dead checker as unknown with a reason — never as healthy', async () => {
    const boom: any = {
      service: 'database',
      link: '/databases',
      check: jest.fn().mockRejectedValue(new Error('pool exploded')),
    };
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = makeService({
      project: { id: 'p1', slug: 'x' } as Project,
      redis,
      checkers: [boom, ...fakeCheckers(allEight().slice(1))],
    });
    const report = await service.evaluate('p1');
    const db = report.services.find((s) => s.service === 'database');
    expect(db?.state).toBe('unknown');
    expect(db?.reason).toMatch(/did not finish/i);
    expect(db?.state).not.toBe('healthy');
    // An unknown among configured services reads as degraded, not as healthy.
    expect(report.overall).toBe('degraded');
  });

  it('times out a checker that hangs', async () => {
    const hung: any = {
      service: 'storage',
      link: '/settings',
      check: jest.fn().mockImplementation(() => new Promise(() => {})),
    };
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = makeService({
      project: { id: 'p1', slug: 'x' } as Project,
      redis,
      checkers: [hung, ...fakeCheckers(allEight().slice(1))],
    });
    const report = await service.evaluate('p1');
    const storage = report.services.find((s) => s.service === 'storage');
    expect(storage?.state).toBe('unknown');
  }, 20000);

  it('404s for a project that does not exist', async () => {
    const service = makeService({
      project: null,
      redis: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
      checkers: fakeCheckers(allEight()),
    });
    await expect(service.evaluate('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('carries no credentials: the serialized report is human strings and service states only', async () => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = makeService({
      project: { id: 'p1', slug: 'x' } as Project,
      redis,
      checkers: fakeCheckers(allEight()),
    });
    const report = await service.evaluate('p1');
    const wire = JSON.stringify(report);
    for (const forbidden of ['connectionInfo', 'adminToken', 'password', 'secret', 'apiKey']) {
      expect(wire).not.toContain(forbidden);
    }
  });
});
