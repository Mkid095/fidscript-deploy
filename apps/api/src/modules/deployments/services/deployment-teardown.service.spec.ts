import { DeploymentTeardownService } from './deployment-teardown.service';

/**
 * What a deleted project loses, and what it keeps.
 *
 * Delete: the containers, the in-flight builds, and the routes — the
 * website stops answering on its names at the moment of the delete.
 * The record and the images stay, for the recovery window: a restore
 * relights the deployment from the stored image.
 */
describe('the deletion teardown', () => {
  function makeService(options: {
    project?: Record<string, unknown> | null;
    deployments?: Array<{ id: string; status: string }>;
  }) {
    const projectUpdate = jest.fn(async () => ({}));
    const deploymentUpdate = jest.fn(
      async (_args: { where: { id: string }; data: { status: string } }) => ({}),
    );
    const teardown = jest.fn(async () => undefined);
    const removeImagesByPrefix = jest.fn(async () => undefined);
    const routesSync = jest.fn(async () => undefined);

    const prisma = {
      project: { findUnique: jest.fn(async () => options.project ?? null) },
      deployment: {
        findMany: jest.fn(async () => options.deployments ?? []),
        update: deploymentUpdate,
      },
    };
    const lifecycle = { teardown, removeImagesByPrefix };
    const service = new DeploymentTeardownService(
      prisma as never,
      lifecycle as never,
      { sync: routesSync } as never,
      { on: jest.fn() } as never,
    );

    return {
      service,
      deploymentUpdate,
      teardown,
      routesSync,
      projectUpdate,
    };
  }

  it('stops the in-flight builds, tears down every container, and re-syncs the routes', async () => {
    const { service, deploymentUpdate, teardown, routesSync } = makeService({
      project: { id: 'p1', slug: 'soostori' },
      deployments: [
        { id: 'aaaaaaaa-1111-2222-3333-444444444444', status: 'BUILDING' },
        { id: 'bbbbbbbb-1111-2222-3333-444444444444', status: 'PENDING' },
        { id: 'cccccccc-1111-2222-3333-444444444444', status: 'SUCCESS' },
      ],
    });

    await service.teardownProject('p1');

    // The in-flight ones are stopped where they stand…
    expect(deploymentUpdate).toHaveBeenCalledWith({
      where: { id: 'aaaaaaaa-1111-2222-3333-444444444444' },
      data: { status: 'STOPPED' },
    });
    expect(deploymentUpdate).toHaveBeenCalledWith({
      where: { id: 'bbbbbbbb-1111-2222-3333-444444444444' },
      data: { status: 'STOPPED' },
    });
    // …a finished one is left alone (its record is history)…
    expect(
      deploymentUpdate.mock.calls.some(
        (call) =>
          call[0].where.id === 'cccccccc-1111-2222-3333-444444444444',
      ),
    ).toBe(false);
    // …every deployment's container goes down — the subdomain answers
    // with the container, and with it, no longer.
    expect(teardown).toHaveBeenCalledWith(
      'fidscript-soostori-aaaaaaaa',
    );
    expect(teardown).toHaveBeenCalledWith(
      'fidscript-soostori-bbbbbbbb',
    );
    expect(teardown).toHaveBeenCalledWith(
      'fidscript-soostori-cccccccc',
    );
    // …and the custom-domain routes are rewritten without it.
    expect(routesSync).toHaveBeenCalled();
  });

  it('touches nothing for a project with no deployments', async () => {
    const { service, deploymentUpdate, teardown, routesSync } = makeService({
      project: { id: 'p2', slug: 'quiet' },
      deployments: [],
    });

    await service.teardownProject('p2');

    expect(deploymentUpdate).not.toHaveBeenCalled();
    expect(teardown).not.toHaveBeenCalled();
    // The routes are still re-synced: the file is rebuilt from the
    // database, and a no-op sync is how the file is guaranteed to match
    // the database.
    expect(routesSync).toHaveBeenCalled();
  });

  it('is a clean no-op when the project row is already gone', async () => {
    const { service, teardown, routesSync } = makeService({ project: null });

    await service.teardownProject('ghost');

    expect(teardown).not.toHaveBeenCalled();
    expect(routesSync).not.toHaveBeenCalled();
  });
});
