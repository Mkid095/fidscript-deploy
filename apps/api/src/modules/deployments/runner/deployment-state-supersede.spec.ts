import { DeploymentStateService } from './deployment-state.service';

/**
 * The production guard on the success path.
 *
 * A build that finishes BEHIND a newer success is recorded as SUCCESS —
 * it did succeed — but it must not move production backwards: no names
 * re-linked, no routes re-synced, no deployed-commit updated, no teardown
 * of the newer container that already owns the name.
 */
describe('a success behind a newer success', () => {
  function makeService({ newerSuccess = false }: { newerSuccess?: boolean }) {
    const deployment = {
      id: 'deployment-1',
      projectId: 'project-1',
      status: 'PENDING',
      releaseId: 'release-1',
      createdAt: new Date('2026-11-16T00:00:00Z'),
      project: { slug: 'soostori', type: 'NODE', ownerId: 'owner-1' },
      release: {
        id: 'release-1',
        commitSha: 'abc123',
        sourceUrl: 'https://github.com/example/soostori.git',
        branch: 'main',
      },
    };

    const prisma = {
      deployment: {
        findUnique: jest.fn(async () => deployment),
        update: jest.fn(async () => ({})),
        findFirst: jest.fn(async (args: Record<string, unknown>) => {
          // The cleanup query carries an orderBy; the supersede check does
          // not. Two different findFirsts, told apart the way the service
          // itself does.
          if (args?.orderBy) return null; // nothing previous to clean up
          if ((args?.where as { id?: unknown })?.id) {
            return newerSuccess ? { id: 'deployment-newer' } : null;
          }
          return null;
        }),
      },
      projectSettings: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async () => ({})),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      projectEnv: { findMany: jest.fn(async () => []) },
      buildConfig: { findUnique: jest.fn(async () => null) },
      release: {
        update: jest.fn(async () => ({})),
        findUnique: jest.fn(async () => null),
      },
      domain: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        findMany: jest.fn(async () => []),
      },
      project: { update: jest.fn(async () => ({})) },
    };

    const eventService = { on: jest.fn(), emit: jest.fn(async () => undefined) };
    const buildRunner = {
      buildAndDeploy: jest.fn(async () => ({
        buildResult: { imageTag: 'fidscript/soostori:v1', port: 3000 },
        deployResult: {
          success: true,
          deploymentUrl: 'https://soostori.apps.example.com',
          deployDurationMs: 100,
        },
      })),
    };
    const routes = { sync: jest.fn(async () => undefined) };
    const domainVerification = { enqueue: jest.fn(async () => undefined) };

    const service = new DeploymentStateService(
      eventService as never,
      prisma as never,
      buildRunner as never,
      { decrypt: jest.fn((v: string) => v) } as never,
      { getProvider: jest.fn(() => ({})) } as never,
      routes as never,
      {} as never,
      { getCloneCredentials: jest.fn(async () => null) } as never,
      { acquire: jest.fn(() => jest.fn()) } as never,
      { environmentFor: jest.fn(async () => null) } as never,
      domainVerification as never,
    );

    return { service, prisma, routes, domainVerification };
  }

  /** What project.update was called with, per call. */
  function projectUpdates(prisma: Record<string, any>) {
    return prisma.project.update.mock.calls.map(
      (call: unknown[]) => (call[0] as { data?: Record<string, unknown> })?.data ?? {},
    ) as Array<Record<string, unknown>>;
  }

  it('takes the name when nothing newer is live', async () => {
    const { service, prisma, routes } = makeService({ newerSuccess: false });

    await service.runDeployment('deployment-1', 'project-1', 'owner-1');

    // The names follow the new deployment…
    expect(prisma.domain.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1', deploymentId: { not: 'deployment-1' } },
      data: { deploymentId: 'deployment-1' },
    });
    // …the routes are published after the names moved…
    expect(routes.sync).toHaveBeenCalled();
    // …production's commit is the one it now runs…
    expect(
      projectUpdates(prisma).some(
        (data) => data.lastDeployedCommit === 'abc123',
      ),
    ).toBe(true);
    // …and the previous container is looked up for teardown.
    expect(prisma.deployment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expect.anything() }),
    );
  });

  it('does not take the name — or tear anything down — behind a newer success', async () => {
    const { service, prisma, routes, domainVerification } =
      makeService({ newerSuccess: true });

    await service.runDeployment('deployment-1', 'project-1', 'owner-1');

    // The build is still recorded a success — it succeeded…
    const deploymentUpdates = (
      (prisma as Record<string, any>).deployment.update.mock.calls as unknown[][]
    ).map(
      (call) =>
        (call[0] as { data?: Record<string, unknown> } | undefined)?.data ?? {},
    ) as Array<Record<string, unknown>>;
    expect(deploymentUpdates.some((data) => data.status === 'SUCCESS')).toBe(
      true,
    );
    // …but production stays where it is: the newer success owns the name.
    expect(prisma.domain.updateMany).not.toHaveBeenCalled();
    expect(routes.sync).not.toHaveBeenCalled();
    expect(
      projectUpdates(prisma).some((data) => 'lastDeployedCommit' in data),
    ).toBe(false);
    // No teardown of the newer deployment's container: the cleanup query
    // (the one with an orderBy) is never made.
    expect(prisma.deployment.findFirst).not.toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expect.anything() }),
    );
    expect(domainVerification.enqueue).not.toHaveBeenCalled();
  });
});
