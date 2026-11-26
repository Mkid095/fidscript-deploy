import { DatabaseHealthChecker } from './database.checker';
import type { Project } from '@prisma/client';

const project = { id: 'p1' } as unknown as Project;

function make(db: unknown, healthCheck: () => Promise<boolean>) {
  const prisma: any = { managedDatabase: { findFirst: jest.fn().mockResolvedValue(db) } };
  const pools: any = { healthCheck: jest.fn().mockImplementation(healthCheck) };
  return { checker: new DatabaseHealthChecker(prisma, pools), pools };
}

describe('database health', () => {
  it('is not configured when the project has no database', async () => {
    const { checker } = make(null, async () => true);
    const h = await checker.check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
  });

  it('is unknown while provisioning — the answer is not final yet', async () => {
    const { checker, pools } = make({ id: 'd1', status: 'provisioning' }, async () => true);
    const h = await checker.check(project);
    expect(h.state).toBe('unknown');
    expect(pools.healthCheck).not.toHaveBeenCalled();
  });

  it('is unhealthy when the database failed to provision', async () => {
    const { checker } = make({ id: 'd1', status: 'failed', updatedAt: new Date() }, async () => true);
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/failed to provision/i);
  });

  it('is healthy when the per-project pool answers a live SELECT 1', async () => {
    const { checker, pools } = make({ id: 'd1', status: 'ready', updatedAt: new Date() }, async () => true);
    const h = await checker.check(project);
    expect(h.state).toBe('healthy');
    expect(pools.healthCheck).toHaveBeenCalledWith('d1');
  });

  it('is unhealthy when the pool says the database is not accepting connections', async () => {
    const { checker } = make({ id: 'd1', status: 'ready', updatedAt: new Date() }, async () => false);
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/not accepting connections/i);
  });

  it('is unknown when the probe itself fails — never healthy', async () => {
    const { checker } = make(
      { id: 'd1', status: 'ready', updatedAt: new Date() },
      async () => {
        throw new Error('pool exploded');
      },
    );
    const h = await checker.check(project);
    expect(h.state).toBe('unknown');
  });
});
