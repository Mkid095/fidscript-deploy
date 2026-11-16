import { DeploymentIdentityService } from './deployment-identity.service';

/**
 * The project's ONE deployment identity.
 *
 * A project is initialized once — the first deployment record creates the
 * identity — and every later deployment, push or rollback is a version
 * underneath it. The database allows no second identity: `project_id` is
 * unique, and a race between two initializations settles on the one that
 * committed first, the loser re-reading the winner's row.
 */
describe("the project's one deployment identity", () => {
  function makeService(options: {
    /** What findUnique returns, in call order. */
    existing: Array<Record<string, unknown> | null>;
    /** create() error — the P2002 race case. */
    createError?: Error;
  }) {
    let findUniqueCalls = 0;
    const findUnique = jest.fn(
      async (): Promise<Record<string, unknown> | null> => {
        const index = Math.min(findUniqueCalls, options.existing.length - 1);
        findUniqueCalls += 1;
        return options.existing[index];
      },
    );

    const create = jest.fn(async (args: { data: Record<string, unknown> }) => {
      if (options.createError) throw options.createError;
      return {
        id: 'identity-1',
        projectId: args.data.projectId,
        initialReleaseId: args.data.initialReleaseId,
      };
    });
    const identityUpdate = jest.fn(async () => ({}));
    const releaseUpdate = jest.fn(async () => ({}));

    const prisma = {
      deploymentIdentity: { findUnique, create, update: identityUpdate },
      release: { update: releaseUpdate },
    };

    return {
      service: new DeploymentIdentityService(prisma as never),
      findUnique,
      create,
      identityUpdate,
      releaseUpdate,
    };
  }

  it('initializes a project with its first release', async () => {
    const { service, create, releaseUpdate } = makeService({ existing: [null] });

    const identity = await service.establish('project-1', 'release-1');

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: 'project-1',
        initialReleaseId: 'release-1',
      }),
    });
    expect((identity as { initialReleaseId: string }).initialReleaseId).toBe(
      'release-1',
    );
    // The release is linked under the identity it builds in.
    expect(releaseUpdate).toHaveBeenCalledWith({
      where: { id: 'release-1' },
      data: { deploymentIdentityId: 'identity-1' },
    });
  });

  it('lets every later deployment attach to the SAME identity — a second is impossible', async () => {
    const { service, create, releaseUpdate } = makeService({
      existing: [{ id: 'identity-1', initialReleaseId: 'release-0' }],
    });

    await service.establish('project-1', 'release-9');

    // Nothing new is created: the row that exists IS the project's
    // identity, and this release links under it.
    expect(create).not.toHaveBeenCalled();
    expect(releaseUpdate).toHaveBeenCalledWith({
      where: { id: 'release-9' },
      data: { deploymentIdentityId: 'identity-1' },
    });
  });

  it('settles a race on the identity that committed first', async () => {
    const race = Object.assign(
      new Error('Unique constraint failed: project_id'),
      { code: 'P2002' },
    );
    const winner = { id: 'identity-winner', initialReleaseId: 'release-rival' };
    const { service, create, findUnique, releaseUpdate } = makeService({
      // First read: nothing yet. Second read: the rival's committed row.
      existing: [null, winner],
      createError: race,
    });

    const identity = await service.establish('project-1', 'release-1');

    // This caller lost the write — it did NOT get its own identity.
    expect(create).toHaveBeenCalled();
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(identity).toBe(winner);
    expect(releaseUpdate).toHaveBeenCalledWith({
      where: { id: 'release-1' },
      data: { deploymentIdentityId: 'identity-winner' },
    });
  });

  it('names an initial release on an identity that lost one', async () => {
    const { service, identityUpdate, create } = makeService({
      existing: [{ id: 'identity-1', initialReleaseId: null }],
    });

    await service.establish('project-1', 'release-2');

    expect(create).not.toHaveBeenCalled();
    expect(identityUpdate).toHaveBeenCalledWith({
      where: { id: 'identity-1' },
      data: { initialReleaseId: 'release-2' },
    });
  });

  it('never locks a project whose first deployment failed — the retry is the next version of the same identity', async () => {
    const { service, create } = makeService({
      // The failed first attempt established the identity; the retry finds it.
      existing: [{ id: 'identity-1', initialReleaseId: 'release-failed' }],
    });

    await service.establish('project-1', 'release-retry');

    // No second identity, no re-initialization: the retry is just another
    // version underneath.
    expect(create).not.toHaveBeenCalled();
  });
});
