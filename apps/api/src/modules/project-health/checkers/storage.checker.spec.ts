import { StorageHealthChecker } from './storage.checker';
import type { Project } from '@prisma/client';

const project = { id: 'p1' } as unknown as Project;

function make(buckets: unknown, testConnection: () => Promise<{ ok: boolean; detail?: string; error?: string }>) {
  const prisma: any = { bucket: { findMany: jest.fn().mockResolvedValue(buckets) } };
  const storage: any = { testConnection: jest.fn().mockImplementation(testConnection) };
  return { checker: new StorageHealthChecker(prisma, storage), storage };
}

const bucket = { provider: 'internal' };

describe('storage health', () => {
  it('is not configured when the project has no buckets', async () => {
    const { checker, storage } = make([], async () => ({ ok: true }));
    const h = await checker.check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
    expect(storage.testConnection).not.toHaveBeenCalled();
  });

  it('is healthy when the storage backend answers', async () => {
    const { checker } = make([bucket], async () => ({ ok: true, detail: 'reachable' }));
    const h = await checker.check(project);
    expect(h.state).toBe('healthy');
  });

  it('is unhealthy when the credentials were rejected', async () => {
    const { checker } = make(
      [bucket],
      async () => ({ ok: false, error: 'MinIO access key/secret was rejected. Check MINIO_ACCESS_KEY / MINIO_SECRET_KEY.' }),
    );
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/credentials were rejected/i);
    // And the reason carries no key material — only the operator-side names.
    expect(h.reason).not.toContain('minioadmin');
  });

  it('is unhealthy when the backend is not reachable', async () => {
    const { checker } = make(
      [bucket],
      async () => ({ ok: false, error: 'Cannot reach MinIO at minio:9000.' }),
    );
    const h = await checker.check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/not reachable/i);
  });

  it('is unknown when the probe itself could not run', async () => {
    const { checker } = make([bucket], async () => {
      throw new Error('MinIO client not initialized');
    });
    const h = await checker.check(project);
    expect(h.state).toBe('unknown');
  });

  it('reuses a fresh probe within its minute — a page load does not re-probe MinIO', async () => {
    const { checker, storage } = make([bucket], async () => ({ ok: true }));
    await checker.check(project);
    await checker.check(project);
    expect(storage.testConnection).toHaveBeenCalledTimes(1);
  });
});
