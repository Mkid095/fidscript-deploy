import { GithubWebhookService } from './github-webhook.service';

/**
 * The push gate — what a webhook delivery may do, decided before any work
 * is enqueued, and recorded, so a delivery GitHub resends is recognized
 * and an older commit can never build its way to the front.
 *
 *   duplicate_delivery  — the delivery's id was already answered
 *   duplicate_commit    — the pushed commit is what production already runs
 *   superseded          — a newer commit is in flight or live; this build
 *                         would take production backwards
 *   accepted            — enqueue the deployment
 */
describe('the push gate', () => {
  function makeService(options: {
    existingDelivery?: Record<string, unknown> | null;
    lastDeployedCommit?: string | null;
    newerInFlight?: Record<string, unknown> | null;
  }) {
    const create = jest.fn(async () => ({}));
    const prisma = {
      webhookDelivery: {
        findUnique: jest.fn(async () => options.existingDelivery ?? null),
        create,
      },
      deployment: {
        findFirst: jest.fn(async () => options.newerInFlight ?? null),
      },
    };
    const service = new GithubWebhookService(
      prisma as never,
      { encrypt: jest.fn(), decrypt: jest.fn() } as never,
      { get: jest.fn() } as never,
    );
    return { service, create, prisma };
  }

  it('drops a delivery GitHub resends — the id was already answered', async () => {
    const { service, create } = makeService({
      existingDelivery: { outcome: 'accepted' },
      lastDeployedCommit: 'abc',
    });

    const result = await service.evaluatePush(
      { id: 'p1', lastDeployedCommit: 'abc' },
      { commitSha: 'abc' },
      'delivery-1',
      new Date(),
    );

    expect(result.outcome).toBe('duplicate_delivery');
    // Nothing is recorded a second time — the first row stands.
    expect(create).not.toHaveBeenCalled();
  });

  it('drops a push of the commit production already runs', async () => {
    const { service, create } = makeService({
      lastDeployedCommit: 'abc123',
    });

    const result = await service.evaluatePush(
      { id: 'p1', lastDeployedCommit: 'abc123' },
      { commitSha: 'abc123' },
      'delivery-1',
      new Date(),
    );

    expect(result.outcome).toBe('duplicate_commit');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deliveryId: 'delivery-1',
        commitSha: 'abc123',
        outcome: 'duplicate_commit',
      }),
    });
  });

  it('drops an older push when a newer commit is already in flight', async () => {
    const { service } = makeService({
      lastDeployedCommit: null,
      newerInFlight: { id: 'deployment-newer' },
    });

    const result = await service.evaluatePush(
      { id: 'p1', lastDeployedCommit: null },
      { commitSha: 'older-commit' },
      'delivery-1',
      new Date(),
    );

    expect(result.outcome).toBe('superseded');
  });

  it('accepts a push when nothing newer is in flight', async () => {
    const { service, create } = makeService({
      lastDeployedCommit: 'abc123',
      newerInFlight: null,
    });

    const result = await service.evaluatePush(
      { id: 'p1', lastDeployedCommit: 'abc123' },
      { commitSha: 'the-next-commit' },
      'delivery-1',
      new Date(),
    );

    expect(result.outcome).toBe('accepted');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deliveryId: 'delivery-1',
        outcome: 'accepted',
      }),
    });
  });

  it('asks the gate for an in-flight build of ANOTHER commit — the same commit never supersedes itself', async () => {
    const findFirst = jest.fn(async () => null);
    const prisma = {
      webhookDelivery: { findUnique: jest.fn(async () => null), create: jest.fn(async () => ({})) },
      deployment: { findFirst },
    };
    const service = new GithubWebhookService(
      prisma as never,
      { encrypt: jest.fn(), decrypt: jest.fn() } as never,
      { get: jest.fn() } as never,
    );

    const result = await service.evaluatePush(
      { id: 'p1', lastDeployedCommit: null },
      { commitSha: 'abc' },
      'delivery-1',
      new Date(),
    );

    expect(result.outcome).toBe('accepted');
    // The in-flight check excludes the pushed commit itself (and
    // commit-less releases): a build of the same commit already running
    // is not an OLDER build overtaking a newer one.
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          release: {
            NOT: { OR: [{ commitSha: 'abc' }, { commitSha: '' }] },
          },
        }),
      }),
    );
  });

  describe('recordOutcome — the turn-aways that get no deployment', () => {
    it('records a delivery the gate turned away', async () => {
      const { service, create } = makeService({});
      await service.recordOutcome('p1', 'abc', 'delivery-1', 'branch_mismatch');
      expect(create).toHaveBeenCalledWith({
        data: {
          deliveryId: 'delivery-1',
          projectId: 'p1',
          commitSha: 'abc',
          outcome: 'branch_mismatch',
        },
      });
    });

    it('absorbs a resended delivery whose first row was dropped — the resend is dropped too', async () => {
      const create = jest.fn(
        async () =>
          Promise.reject(
            Object.assign(new Error('Unique constraint failed'), {
              code: 'P2002',
            }),
          ),
      );
      const prisma = {
        webhookDelivery: { findUnique: jest.fn(async () => null), create },
        deployment: { findFirst: jest.fn(async () => null) },
      };
      const service = new GithubWebhookService(
        prisma as never,
        { encrypt: jest.fn(), decrypt: jest.fn() } as never,
        { get: jest.fn() } as never,
      );

      await expect(
        service.recordOutcome('p1', 'abc', 'delivery-1', 'auto_deploy_off'),
      ).resolves.toBeUndefined();
      expect(create).toHaveBeenCalled();
    });
  });
});
