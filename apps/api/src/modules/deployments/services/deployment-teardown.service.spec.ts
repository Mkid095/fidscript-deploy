import { DeploymentTeardownService } from './deployment-teardown.service';

/**
 * What a deleted project loses, and what it keeps.
 *
 * Delete: the containers, the in-flight builds, and the routes — the
 * website stops answering on its names at the moment of the delete. The
 * record and the images stay, for the recovery window: a restore relights
 * the deployment from the stored image. The deletion task records every
 * step, so a failed cleanup is retried without redoing the finished work,
 * and the sweep finds the deletions that predate the teardown.
 */
describe('the deletion teardown', () => {
  function makeService(options: {
    project?: Record<string, unknown> | null;
    deployments?: Array<{ id: string; status: string }>;
    task?: Record<string, unknown> | null;
    staleTasks?: Array<Record<string, unknown>>;
    deletedWithoutTask?: Array<{ id: string }>;
    teardownFailsAt?: number;
  }) {
    const deploymentUpdateMany = jest.fn(
      async (_args: { where: { id: { in: string[] } }; data: { status: string } }) =>
        ({}),
    );
    const teardown = jest.fn(async (_name: string) => undefined);
    const removeImagesByPrefix = jest.fn(async (_prefix: string) => undefined);
    const routesSync = jest.fn(async () => undefined);
    const taskUpdate = jest.fn(
      async (
        _args: { where: { projectId: string }; data: Record<string, unknown> },
      ) => ({}),
    );
    const taskUpsert = jest.fn(async () => ({
      id: 'task-1',
      projectId: 'p1',
      state: options.task?.state ?? 'REQUESTED',
      resources: options.task?.resources ?? {},
      attempts: options.task?.attempts ?? 0,
    }));
    const unregisterWebhook = jest.fn(async () => 'unregistered');
    const releaseForProject = jest.fn(async () => ({ released: 1, skipped: 0 }));

    const prisma = {
      project: {
        findUnique: jest.fn(async () => options.project ?? null),
        findMany: jest.fn(async () => options.deletedWithoutTask ?? []),
      },
      deployment: {
        findMany: jest.fn(async () => options.deployments ?? []),
        updateMany: deploymentUpdateMany,
      },
      projectDeletionTask: {
        upsert: taskUpsert,
        update: taskUpdate,
        findMany: jest.fn(async () => options.staleTasks ?? []),
      },
    };
    const lifecycle = {
      teardown: (name: string) => {
        // A teardown that fails part-way records the failure and resumes.
        if (options.teardownFailsAt !== undefined && teardown.mock.calls.length >= options.teardownFailsAt) {
          return Promise.reject(new Error(`container ${name} refused`));
        }
        return teardown(name);
      },
      removeImagesByPrefix,
    };
    const events = { on: jest.fn() };
    const service = new DeploymentTeardownService(
      prisma as never,
      lifecycle as never,
      { sync: routesSync } as never,
      events as never,
      { unregisterWebhook } as never,
      { releaseForProject } as never,
    );

    return {
      service,
      deploymentUpdateMany,
      teardown,
      routesSync,
      taskUpdate,
      taskUpsert,
      unregisterWebhook,
      releaseForProject,
      removeImagesByPrefix,
      events,
      prisma,
    };
  }

  it('takes the surface down, stops the in-flight builds, and records CLEANED', async () => {
    const { service, deploymentUpdateMany, teardown, routesSync, taskUpdate } =
      makeService({
        project: { id: 'p1', slug: 'soostori' },
        task: { state: 'REQUESTED', resources: {}, attempts: 0 },
        deployments: [
          { id: 'aaaaaaaa-1111-2222-3333-444444444444', status: 'BUILDING' },
          { id: 'bbbbbbbb-1111-2222-3333-444444444444', status: 'PENDING' },
          { id: 'cccccccc-1111-2222-3333-444444444444', status: 'SUCCESS' },
        ],
      });

    await service.teardownProject('p1');

    // The in-flight ones are stopped where they stand; a finished one is
    // left alone (its record is history).
    expect(deploymentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [
            'aaaaaaaa-1111-2222-3333-444444444444',
            'bbbbbbbb-1111-2222-3333-444444444444',
          ],
        },
      },
      data: { status: 'STOPPED' },
    });
    // Every deployment's container goes down — the subdomain answers with
    // the container, and with it, no longer.
    expect(teardown).toHaveBeenCalledWith('fidscript-soostori-aaaaaaaa');
    expect(teardown).toHaveBeenCalledWith('fidscript-soostori-bbbbbbbb');
    expect(teardown).toHaveBeenCalledWith('fidscript-soostori-cccccccc');
    // The custom-domain routes are rewritten without it, and the task is
    // CLEANED with the finished steps recorded.
    expect(routesSync).toHaveBeenCalled();
    expect(taskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'p1' },
        data: expect.objectContaining({ state: 'CLEANED' }),
      }),
    );
  });

  it('resumes where a failed attempt stopped — the finished steps are not redone', async () => {
    const { service, teardown } = makeService({
      project: { id: 'p1', slug: 'soostori' },
      task: {
        state: 'CLEANUP_FAILED',
        resources: { containersTornDown: ['fidscript-soostori-aaaaaaaa'] },
        attempts: 1,
      },
      deployments: [
        { id: 'aaaaaaaa-1111-2222-3333-444444444444', status: 'SUCCESS' },
        { id: 'bbbbbbbb-1111-2222-3333-444444444444', status: 'SUCCESS' },
      ],
    });

    await service.teardownProject('p1');

    // The container that was already down is not asked twice; the one that
    // was still up is taken down now.
    expect(teardown).not.toHaveBeenCalledWith('fidscript-soostori-aaaaaaaa');
    expect(teardown).toHaveBeenCalledWith('fidscript-soostori-bbbbbbbb');
  });

  it('records CLEANUP_FAILED when a step fails, keeping the finished work', async () => {
    const { service, taskUpdate } = makeService({
      project: { id: 'p1', slug: 'soostori' },
      task: { state: 'REQUESTED', resources: {}, attempts: 0 },
      teardownFailsAt: 1,
      deployments: [
        { id: 'aaaaaaaa-1111-2222-3333-444444444444', status: 'SUCCESS' },
        { id: 'bbbbbbbb-1111-2222-3333-444444444444', status: 'SUCCESS' },
      ],
    });

    await expect(service.teardownProject('p1')).rejects.toThrow();
    expect(
      taskUpdate.mock.calls.some(
        (call) =>
          (call[0] as { data?: { state?: string } }).data?.state ===
          'CLEANUP_FAILED',
      ),
    ).toBe(true);
  });

  it('sweeps the deleted projects that have no task yet, and the failed ones', async () => {
    const { service, teardown } = makeService({
      project: { id: 'p1', slug: 'orphan' },
      staleTasks: [
        { projectId: 'p-failed', state: 'CLEANUP_FAILED', updatedAt: new Date() },
      ],
      deletedWithoutTask: [{ id: 'p1' }],
      deployments: [{ id: 'dddddddd-1111-2222-3333-444444444444', status: 'SUCCESS' }],
    });

    const repaired = await service.sweep();

    expect(repaired).toEqual(expect.arrayContaining(['p1', 'p-failed']));
    expect(teardown).toHaveBeenCalledWith('fidscript-orphan-dddddddd');
  });

  it('is a clean no-op when the project row is already gone', async () => {
    const { service, teardown, routesSync } = makeService({ project: null });

    await service.teardownProject('ghost');

    expect(teardown).not.toHaveBeenCalled();
    expect(routesSync).not.toHaveBeenCalled();
  });

  it('releases the domains and unregisters the webhook before the rows are gone', async () => {
    const { service, releaseForProject, unregisterWebhook } = makeService({
      project: { id: 'p1', slug: 'soostori' },
    });

    const result = await service.releaseExternal({
      projectId: 'p1',
      sourceRepo: 'https://github.com/acme/web',
      githubHookId: 42,
      ownerId: 'owner-1',
    });

    expect(releaseForProject).toHaveBeenCalledWith('p1', 'owner-1');
    expect(unregisterWebhook).toHaveBeenCalledWith({
      projectId: 'p1',
      sourceRepo: 'https://github.com/acme/web',
      githubHookId: 42,
      ownerId: 'owner-1',
    });
    expect(result).toEqual({
      domains: { released: 1, skipped: 0 },
      webhook: 'unregistered',
    });
  });

  it('purging removes the images and marks the task PURGED', async () => {
    const { service, events, removeImagesByPrefix, taskUpdate } = makeService({
      project: { id: 'p1', slug: 'soostori' },
    });

    service.onModuleInit();
    const handlers = (events.on as jest.Mock).mock.calls as Array<[string, (e: unknown) => void]>;
    const purged = handlers.find(([type]) => type === 'projects.project.purged')!;
    await purged[1]({ projectId: 'p1', metadata: { slug: 'soostori' } });

    expect(removeImagesByPrefix).toHaveBeenCalledWith('fidscript/soostori');
    expect(
      taskUpdate.mock.calls.some(
        (call) =>
          (call[0] as { data?: { state?: string } }).data?.state === 'PURGED',
      ),
    ).toBe(true);

    // The timers must not leak past the module's life.
    service.onModuleDestroy();
  });
});
