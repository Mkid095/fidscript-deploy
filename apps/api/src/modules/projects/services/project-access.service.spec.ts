import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectAccessService } from './project-access.service';

/**
 * The access rules, tested.
 *
 * These are the rules that decide whether a caller may act on a project.
 * Two of them were broken — a project key was let through to any project,
 * and the role check returned before the member was even looked up — and a
 * `viewer` could delete a project, mint an API key and edit environment
 * variables.
 *
 * The Prisma client is mocked by hand: the service takes one dependency, and
 * a test that needs a database to answer "is this person a member" is a
 * test that cannot run in CI.
 */

const PROJECT_A = '11111111-1111-1111-1111-111111111111';
const PROJECT_B = '22222222-2222-2222-2222-222222222222';
const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';
const VIEWER = 'viewer-user';
const ADMIN = 'admin-user';

interface MockOptions {
  members?: Record<string, string>;
  orgMembers?: Record<string, string>;
  projects?: Record<string, { ownerId: string; organizationId?: string | null }>;
}

function makePrisma(options: MockOptions = {}) {
  const projects = options.projects ?? {
    [PROJECT_A]: { ownerId: OWNER_A },
    [PROJECT_B]: { ownerId: OWNER_B },
  };
  const members = options.members ?? {};
  const orgMembers = options.orgMembers ?? {};

  return {
    project: {
      findUnique: jest.fn(async ({ where }: any) => {
        const record = projects[where.id] ?? projects[where.slug];
        if (!record) return null;
        return { id: where.id ?? where.slug, ...record, owner: { id: record.ownerId, email: 'x@y.z', name: 'X' } };
      }),
    },
    projectMember: {
      findUnique: jest.fn(async ({ where }: any) => {
        const key = where.projectId_userId ?? where;
        const role = members[`${key.projectId}:${key.userId}`];
        return role ? { id: 'member', role } : null;
      }),
    },
    organizationMember: {
      findUnique: jest.fn(async ({ where }: any) => {
        const key = where.organizationId_userId ?? where;
        const role = orgMembers[`${key.organizationId}:${key.userId}`];
        return role ? { id: 'org-member', role: { name: role } } : null;
      }),
    },
  };
}

function makeService(prisma: any) {
  return new ProjectAccessService(prisma as any);
}

describe('ProjectAccessService', () => {
  describe('a project API key', () => {
    it('may read its own project', async () => {
      const service = makeService(makePrisma());
      const project = await service.findProjectWithAccess('api-key', PROJECT_A, PROJECT_A);
      expect(project.id).toBe(PROJECT_A);
    });

    it('may NOT read another project', async () => {
      const service = makeService(makePrisma());
      await expect(
        service.findProjectWithAccess('api-key', PROJECT_B, PROJECT_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('may NOT read another project when the route carries a slug', async () => {
      const prisma = makePrisma({
        projects: { 'project-b': { ownerId: OWNER_B } } as any,
      });
      const service = makeService(prisma);
      await expect(
        service.findProjectWithAccess('api-key', 'project-b', PROJECT_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is refused when its project cannot be resolved — it fails closed', async () => {
      const service = makeService(makePrisma());
      await expect(
        service.findProjectWithAccess('api-key', PROJECT_A, undefined),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('may NOT pass a permission check for another project', async () => {
      const service = makeService(makePrisma());
      await expect(
        service.checkPermission('api-key', PROJECT_B, ['admin', 'owner'], PROJECT_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('may pass a permission check for its own project', async () => {
      const service = makeService(makePrisma());
      await expect(
        service.checkPermission('api-key', PROJECT_A, ['admin', 'owner'], PROJECT_A),
      ).resolves.toBeUndefined();
    });
  });

  describe('a person', () => {
    it('may read a project they own', async () => {
      const service = makeService(makePrisma());
      const project = await service.findProjectWithAccess(OWNER_A, PROJECT_A);
      expect(project.id).toBe(PROJECT_A);
    });

    it('may NOT read a project they are not a member of', async () => {
      const service = makeService(makePrisma());
      await expect(
        service.findProjectWithAccess('stranger', PROJECT_A),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('may NOT read a project that does not exist', async () => {
      const service = makeService(makePrisma());
      await expect(
        service.findProjectWithAccess(OWNER_A, 'no-such-project'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('the owner always passes a permission check, whatever it allows', async () => {
      const service = makeService(makePrisma());
      await expect(
        service.checkPermission(OWNER_A, PROJECT_A, ['viewer']),
      ).resolves.toBeUndefined();
    });

    it('a VIEWER member may NOT perform an administrator operation', async () => {
      const service = makeService(
        makePrisma({ members: { [`${PROJECT_A}:${VIEWER}`]: 'viewer' } }),
      );
      await expect(
        service.checkPermission(VIEWER, PROJECT_A, ['admin', 'owner']),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('a DEVELOPER member may NOT perform an administrator operation', async () => {
      const service = makeService(
        makePrisma({ members: { [`${PROJECT_A}:${VIEWER}`]: 'developer' } }),
      );
      await expect(
        service.checkPermission(VIEWER, PROJECT_A, ['admin', 'owner']),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('an ADMIN member MAY perform an administrator operation', async () => {
      const service = makeService(
        makePrisma({ members: { [`${PROJECT_A}:${ADMIN}`]: 'admin' } }),
      );
      await expect(
        service.checkPermission(ADMIN, PROJECT_A, ['admin', 'owner']),
      ).resolves.toBeUndefined();
    });

    it('a member whose role is owner may perform an owner operation', async () => {
      const service = makeService(
        makePrisma({ members: { [`${PROJECT_A}:${ADMIN}`]: 'owner' } }),
      );
      await expect(
        service.checkPermission(ADMIN, PROJECT_A, ['owner']),
      ).resolves.toBeUndefined();
    });

    it('a member of another project does not gain access here', async () => {
      const service = makeService(
        makePrisma({ members: { [`${PROJECT_B}:${VIEWER}`]: 'owner' } }),
      );
      await expect(
        service.checkPermission(VIEWER, PROJECT_A, ['owner']),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('a workspace', () => {
    it('a team member may reach the team\'s project', async () => {
      const service = makeService(
        makePrisma({
          projects: { [PROJECT_A]: { ownerId: OWNER_A, organizationId: 'org-1' } } as any,
          orgMembers: { 'org-1:team-user': 'DEVELOPER' },
        }),
      );
      await expect(
        service.findProjectWithAccess('team-user', PROJECT_A),
      ).resolves.toBeDefined();
    });

    it('a team member acts with the team\'s role, not an unrestricted one', async () => {
      const service = makeService(
        makePrisma({
          projects: { [PROJECT_A]: { ownerId: OWNER_A, organizationId: 'org-1' } } as any,
          orgMembers: { 'org-1:team-user': 'VIEWER' },
        }),
      );
      await expect(
        service.checkPermission('team-user', PROJECT_A, ['admin', 'owner']),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
