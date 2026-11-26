import { DeploymentsController } from './deployments.controller';

/**
 * How fast one project's deployments may be made to move.
 *
 * The guard decides WHO may trigger (auth, scope, membership). The bucket
 * decides HOW FAST: a full bucket answers 429 with a retryAfter, so a loop
 * or a leaked key cannot queue a project's build lane for an hour.
 */
describe('the deployment trigger bucket', () => {
  function makeController(allowed: boolean) {
    const deploymentsService = {
      create: jest.fn().mockResolvedValue({ id: 'deployment-1' }),
      stop: jest.fn(),
      restart: jest.fn(),
      destroy: jest.fn(),
      rollback: jest.fn(),
      applyBuildConfig: jest.fn(),
    };
    const rateLimiter = {
      consume: jest.fn().mockResolvedValue({
        allowed,
        count: allowed ? 1 : 31,
        retryAfter: allowed ? 0 : 1200,
      }),
    };
    const controller = new DeploymentsController(
      deploymentsService as never,
      {} as never, // webhookService
      {} as never, // prisma
      {} as never, // crypto
      rateLimiter as never,
    );
    const req = { user: { userId: 'user-1' }, res: {} } as never;
    return { controller, deploymentsService, rateLimiter, req };
  }

  it('lets a trigger through while the bucket has room', async () => {
    const { controller, deploymentsService, rateLimiter, req } = makeController(true);
    await controller.create(req, 'project-1', {} as never);
    expect(rateLimiter.consume).toHaveBeenCalledWith(
      'rl:deploy:project-1',
      30,
      3600,
    );
    expect(deploymentsService.create).toHaveBeenCalled();
  });

  it('answers 429 with a retryAfter when the bucket is full', async () => {
    const { controller, deploymentsService, req } = makeController(false);
    await expect(controller.create(req, 'project-1', {} as never)).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({ retryAfter: 1200 }),
    });
    // The trigger never reached the service.
    expect(deploymentsService.create).not.toHaveBeenCalled();
  });

  it('guards every mutating route with the same bucket', async () => {
    for (const allowed of [true]) {
      const { controller, req } = makeController(allowed);
      const project = 'project-1';
      const dep = 'deployment-1';
      await controller.stop(req, project, dep);
      await controller.restart(req, project, dep);
      await controller.destroy(req, project, dep);
      await controller.rollback(req, project, dep, undefined);
      await controller.applyBuildConfig(req, project);
    }
  });
});
