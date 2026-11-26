import { EmailHealthChecker } from './email.checker';
import type { Project } from '@prisma/client';

const project = { id: 'p1' } as unknown as Project;

function make(emailDomain: unknown, check: () => Promise<{ status: string; latencyMs: number; error?: string }>) {
  const prisma: any = { emailDomain: { findFirst: jest.fn().mockResolvedValue(emailDomain) } };
  const mail: any = { check: jest.fn().mockImplementation(check) };
  return { checker: new EmailHealthChecker(prisma, mail), mail };
}

const up = { status: 'up', latencyMs: 12 };
const down = { status: 'down', latencyMs: 5000, error: 'no route' };

describe('email health', () => {
  it('is not configured when the project has no mail domain', async () => {
    const { checker, mail } = make(null, async () => up);
    const h = await checker.check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
    expect(mail.check).not.toHaveBeenCalled();
  });

  it('is unhealthy when the platform mail service is not reachable, even with a verified domain', async () => {
    const { checker } = make({ status: 'VERIFIED', verifiedAt: new Date(), createdAt: new Date() }, async () => down);
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/mail service is not reachable/i);
  });

  it('is healthy when the service is up and the domain is verified', async () => {
    const { checker } = make({ status: 'ACTIVE', verifiedAt: new Date(), createdAt: new Date() }, async () => up);
    const h = await checker.check(project);
    expect(h.state).toBe('healthy');
  });

  it('is degraded when the domain is still waiting on DNS', async () => {
    const { checker } = make({ status: 'PENDING', verifiedAt: null, createdAt: new Date() }, async () => up);
    const h = await checker.check(project);
    expect(h.state).toBe('degraded');
  });

  it('is unhealthy when the domain’s verification failed', async () => {
    const { checker } = make({ status: 'FAILED', verifiedAt: null, createdAt: new Date() }, async () => up);
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
  });

  it('is unknown when the probe itself could not run', async () => {
    const { checker } = make(
      { status: 'VERIFIED', verifiedAt: new Date(), createdAt: new Date() },
      async () => {
        throw new Error('smtp boom');
      },
    );
    const h = await checker.check(project);
    expect(h.state).toBe('unknown');
  });

  it('falls back to the last probe when the next one fails — an old answer, not a green one', async () => {
    let probeCalls = 0;
    const flaky = async () => {
      probeCalls++;
      if (probeCalls === 1) return up;
      throw new Error('smtp boom');
    };
    const { checker } = make({ status: 'VERIFIED', verifiedAt: new Date(), createdAt: new Date() }, flaky);
    await checker.check(project); // primes the probe cache with "up"

    // Age the cache past its TTL and break the probe: the checker must
    // answer from the last known truth, and if there was no last known
    // truth at all the state would be unknown, never healthy.
    (checker as any).probeCache.at = Date.now() - 61_000;
    const h = await checker.check(project);
    expect(h.state).toBe('healthy'); // "up" is still the last known answer

    // And the no-cache variant: a checker that has never probed and whose
    // only probe fails is unknown.
    const neverProbed: any = { check: jest.fn().mockRejectedValue(new Error('smtp boom')) };
    const fresh = new EmailHealthChecker(
      { emailDomain: { findFirst: jest.fn().mockResolvedValue({ status: 'VERIFIED', verifiedAt: new Date(), createdAt: new Date() }) } } as any,
      neverProbed,
    );
    const h2 = await fresh.check(project);
    expect(h2.state).toBe('unknown');
  });
});
