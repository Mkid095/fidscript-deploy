import { DomainsHealthChecker } from './domains.checker';
import type { Project } from '@prisma/client';

const project = { id: 'p1' } as unknown as Project;

function make(domains: unknown) {
  const prisma: any = { domain: { findMany: jest.fn().mockResolvedValue(domains) } };
  return new DomainsHealthChecker(prisma);
}

const d = (domain: string, healthStatus: string, lastHealthScore: number | null = null) => ({
  domain,
  healthStatus,
  lastHealthScore,
  lastVerifiedAt: new Date(),
});

describe('domain health', () => {
  it('is not configured when the project has no domains', async () => {
    const h = await make([]).check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
  });

  it('is healthy when every domain is passing', async () => {
    const h = await make([d('a.com', 'HEALTHY'), d('b.com', 'HEALTHY')]).check(project);
    expect(h.state).toBe('healthy');
  });

  it('is degraded when a domain is passing with checks failing, and names it', async () => {
    const h = await make([d('good.com', 'HEALTHY'), d('bad.com', 'DEGRADED', 6)]).check(project);
    expect(h.state).toBe('degraded');
    expect(h.reason).toContain('bad.com');
  });

  it('is unhealthy when a domain is failing its checks', async () => {
    const h = await make([d('broken.com', 'FAILED', 0)]).check(project);
    expect(h.state).toBe('unhealthy');
  });

  it('is unknown when a domain has not been verified yet', async () => {
    const h = await make([d('new.com', 'PENDING')]).check(project);
    expect(h.state).toBe('unknown');
  });
});
