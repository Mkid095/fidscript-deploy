import { SecretsService } from './secrets.service';
import { encryptSecret } from './secret-encryption';

/**
 * The platform's own secrets.
 *
 * A platform-level secret has no project: `projectId` is null. Prisma's
 * compound unique lookup cannot match a NULL column, so the lookup that
 * worked for a project's secret **threw** for the platform's — and the
 * email bootstrap failed on every start of the API.
 */

// The secrets are encrypted with the platform's key; the test needs one.
const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.ENCRYPTION_KEY = TEST_KEY;

function makeService() {
  const prisma = {
    secret: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
      upsert: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
  };
  const service = new SecretsService(prisma as any);
  return { service, prisma };
}

describe('a platform secret', () => {
  it('is FOUND with findFirst, not with a compound lookup', async () => {
    const { service, prisma } = makeService();
    prisma.secret.findFirst.mockResolvedValueOnce({
      id: 'secret-1',
      encryptedValue: encryptSecret('the-value'),
    } as any);

    await service.get(null, 'SMTP_PASSWORD');

    expect(prisma.secret.findFirst).toHaveBeenCalledWith({
      where: { projectId: null, key: 'SMTP_PASSWORD' },
    });
    // The compound lookup is never attempted with a null project.
    expect(prisma.secret.findUnique).not.toHaveBeenCalled();
  });

  it('is WRITTEN as find-then-update-or-create', async () => {
    const { service, prisma } = makeService();
    await service.set(null, 'SMTP_PASSWORD', 'the-password');
    expect(prisma.secret.create).toHaveBeenCalled();
    expect(prisma.secret.upsert).not.toHaveBeenCalled();
  });

  it('is DELETED without a compound lookup', async () => {
    const { service, prisma } = makeService();
    prisma.secret.deleteMany.mockResolvedValueOnce({ count: 1 } as any);
    const deleted = await service.delete(null, 'SMTP_PASSWORD');
    expect(deleted).toBe(true);
    expect(prisma.secret.deleteMany).toHaveBeenCalledWith({
      where: { projectId: null, key: 'SMTP_PASSWORD' },
    });
  });
});

describe("a project's secret", () => {
  it('still uses the compound lookup', async () => {
    const { service, prisma } = makeService();
    prisma.secret.findUnique.mockResolvedValueOnce({
      id: 'secret-2',
      encryptedValue: encryptSecret('the-value'),
    } as any);

    await service.get('project-1', 'API_TOKEN');

    expect(prisma.secret.findUnique).toHaveBeenCalledWith({
      where: { projectId_key: { projectId: 'project-1', key: 'API_TOKEN' } },
    });
    expect(prisma.secret.findFirst).not.toHaveBeenCalled();
  });
});
