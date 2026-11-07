import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectMemberGuard } from './project-member.guard';

/**
 * The project guard, tested.
 *
 * The guard used to wave every API-key caller through, on the strength of a
 * comment claiming the upstream guard had already compared the key's project
 * with the route's. It had not — so a key minted for one project could read,
 * rename and delete another project's resources.
 */

const PROJECT_A = '11111111-1111-1111-1111-111111111111';
const PROJECT_B = '22222222-2222-2222-2222-222222222222';
const OWNER = 'owner-a';
const MEMBER = 'member-a';

function makePrisma(options: {
  owners?: Record<string, string>;
  members?: string[];
} = {}) {
  const owners = options.owners ?? { [PROJECT_A]: OWNER, [PROJECT_B]: 'owner-b' };
  const members = options.members ?? [];
  return {
    project: {
      findUnique: jest.fn(async ({ where }: any) => {
        const id = where.id ?? where.slug;
        if (!owners[id]) return null;
        return { id, ownerId: owners[id] };
      }),
    },
    projectMember: {
      findUnique: jest.fn(async ({ where }: any) => {
        const key = where.projectId_userId ?? where;
        const found = members.includes(`${key.projectId}:${key.userId}`);
        return found ? { id: 'member' } : null;
      }),
    },
  };
}

function makeContext(user: any, params: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as unknown as ExecutionContext;
}

describe('ProjectMemberGuard', () => {
  it('refuses a request with no caller', async () => {
    const guard = new ProjectMemberGuard(makePrisma() as any);
    await expect(
      guard.canActivate(makeContext(undefined, { projectId: PROJECT_A })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a route with no project', async () => {
    const guard = new ProjectMemberGuard(makePrisma() as any);
    await expect(
      guard.canActivate(makeContext({ userId: OWNER }, {})),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('a project API key', () => {
    it('may reach its own project', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(
          makeContext(
            { userId: 'api-key', isApiKey: true, keyType: 'project', projectId: PROJECT_A },
            { projectId: PROJECT_A },
          ),
        ),
      ).resolves.toBe(true);
    });

    it('may NOT reach another project', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(
          makeContext(
            { userId: 'api-key', isApiKey: true, keyType: 'project', projectId: PROJECT_A },
            { projectId: PROJECT_B },
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('may NOT reach another project when the route carries a slug', async () => {
      const prisma = makePrisma({ owners: { 'project-b': 'owner-b' } as any });
      const guard = new ProjectMemberGuard(prisma as any);
      await expect(
        guard.canActivate(
          makeContext(
            { userId: 'api-key', isApiKey: true, keyType: 'project', projectId: PROJECT_A },
            { projectId: 'project-b' },
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is refused when its project cannot be resolved — it fails closed', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(
          makeContext(
            { userId: 'api-key', isApiKey: true, keyType: 'project', projectId: undefined },
            { projectId: PROJECT_A },
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is refused when the credential\'s kind is unknown', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(
          makeContext(
            { userId: 'api-key', isApiKey: true, keyType: 'something-else', projectId: PROJECT_A },
            { projectId: PROJECT_A },
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('an account API key', () => {
    it('acts with its owner\'s rights — a member is let through', async () => {
      const prisma = makePrisma({ members: [`${PROJECT_A}:${MEMBER}`] });
      const guard = new ProjectMemberGuard(prisma as any);
      await expect(
        guard.canActivate(
          makeContext(
            { userId: MEMBER, isApiKey: true, keyType: 'account' },
            { projectId: PROJECT_A },
          ),
        ),
      ).resolves.toBe(true);
    });

    it('is refused when its owner is not a member', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(
          makeContext(
            { userId: 'stranger', isApiKey: true, keyType: 'account' },
            { projectId: PROJECT_A },
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('a person', () => {
    it('the owner is let through', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(makeContext({ userId: OWNER }, { projectId: PROJECT_A })),
      ).resolves.toBe(true);
    });

    it('a member is let through', async () => {
      const prisma = makePrisma({ members: [`${PROJECT_A}:${MEMBER}`] });
      const guard = new ProjectMemberGuard(prisma as any);
      await expect(
        guard.canActivate(makeContext({ userId: MEMBER }, { projectId: PROJECT_A })),
      ).resolves.toBe(true);
    });

    it('a stranger is refused', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(makeContext({ userId: 'stranger' }, { projectId: PROJECT_A })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('a project that does not exist is a 404, not a 403', async () => {
      const guard = new ProjectMemberGuard(makePrisma() as any);
      await expect(
        guard.canActivate(makeContext({ userId: OWNER }, { projectId: 'no-such-project' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
