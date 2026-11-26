import { InstantDbHealthChecker } from './instantdb.checker';
import type { Project } from '@prisma/client';

const project = { id: 'p1' } as unknown as Project;

function make(app: unknown, decrypt: (s: string) => string, getApp: (id: string, t: string) => Promise<unknown>) {
  const prisma: any = { projectInstantApp: { findFirst: jest.fn().mockResolvedValue(app) } };
  const crypto: any = { decrypt: jest.fn().mockImplementation(decrypt) };
  const instant: any = { getApp: jest.fn().mockImplementation(getApp) };
  return { checker: new InstantDbHealthChecker(prisma, instant, crypto), instant, crypto };
}

describe('instantdb health', () => {
  it('is not configured when the project has no Instant application', async () => {
    const { checker } = make(null, () => 'tok', async () => ({}));
    const h = await checker.check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
  });

  it('is unhealthy when the stored credentials can no longer be read', async () => {
    const { checker } = make(
      { appId: 'a1', adminTokenEnc: 'enc', updatedAt: new Date() },
      () => {
        throw new Error('decryption failed');
      },
      async () => ({}),
    );
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/credentials can no longer be read/i);
  });

  it('is healthy when the app still exists under the credentials we hold', async () => {
    const { checker, instant } = make(
      { appId: 'a1', adminTokenEnc: 'enc', updatedAt: new Date() },
      () => 'tok',
      async () => ({ id: 'a1' }),
    );
    const h = await checker.check(project);
    expect(h.state).toBe('healthy');
    expect(instant.getApp).toHaveBeenCalledWith('a1', 'tok');
  });

  it('is unhealthy when the server says the app no longer exists', async () => {
    const { checker } = make(
      { appId: 'a1', adminTokenEnc: 'enc', updatedAt: new Date() },
      () => 'tok',
      async () => null,
    );
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/no longer exists/i);
  });

  it('is unknown when the server does not answer in time — a probe failure, not a verdict', async () => {
    const { checker } = make(
      { appId: 'a1', adminTokenEnc: 'enc', updatedAt: new Date() },
      () => 'tok',
      () => new Promise(() => {}), // never settles: the 4s cap rejects
    );
    const h = await checker.check(project);
    expect(h.state).toBe('unknown');
  }, 15000);
});
