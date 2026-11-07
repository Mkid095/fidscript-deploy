import { ForbiddenException } from '@nestjs/common';
import { FunctionsController } from './functions.controller';
import { FunctionsReadController } from './functions-read.controller';
import { FunctionsAccessService } from '@/modules/functions/services/functions-access.service';
import { ProjectAccessService } from '@/modules/projects/services/project-access.service';
import { ProjectSecretAccessService } from '@/modules/projects/services/project-secret-access.service';

/**
 * The functions console, tested.
 *
 * The functions of a project are code that runs with the project's
 * credentials. A member who may only read the project must not be able to
 * write, deploy or invoke them, and must not read the variables that hold
 * the credentials.
 */

const PROJECT = '11111111-1111-1111-1111-111111111111';
const OWNER = 'owner-user';
const DEVELOPER = 'developer-user';
const VIEWER = 'viewer-user';

function makePrisma(role?: string) {
  return {
    project: {
      findUnique: jest.fn(async () => ({ id: PROJECT, ownerId: OWNER, organizationId: null })),
    },
    projectMember: {
      findUnique: jest.fn(async ({ where }: any) => {
        const key = where.projectId_userId ?? where;
        if (key.userId === OWNER) return null;
        return role ? { id: 'm', role } : null;
      }),
    },
    organizationMember: { findUnique: jest.fn(async () => null) },
  };
}

function makeController(role?: string) {
  const prisma = makePrisma(role);
  const access = new ProjectAccessService(prisma as any);
  const functionsService = {
    createFunction: jest.fn(async () => ({ id: 'fn-1' })),
    listFunctions: jest.fn(async () => [{ id: 'fn-1', envVars: { KEY: '[masked]' } }]),
    getFunction: jest.fn(async () => ({ id: 'fn-1', envVars: { KEY: '[masked]' } })),
    updateFunction: jest.fn(async () => ({ id: 'fn-1' })),
    deleteFunction: jest.fn(async () => ({ deleted: true })),
    deployFunction: jest.fn(async () => ({ deployed: true })),
    invokeFunction: jest.fn(async () => ({ success: true })),
  };
  const secrets = new ProjectSecretAccessService(prisma as any);
  const accessService = new FunctionsAccessService(access, secrets);
  const controller = new FunctionsController(functionsService as any, accessService);
  const reader = new FunctionsReadController(functionsService as any, accessService);
  return { controller, reader, functionsService };
}

/** A request as the guard leaves it. */
function requestFor(userId: string) {
  return { user: { userId } } as any;
}

describe('the functions console', () => {
  describe('writing', () => {
    it('the owner may create a function', async () => {
      const { controller, functionsService } = makeController();
      await controller.createFunction(PROJECT, { name: 'fn', runtime: 'nodejs' } as any, requestFor(OWNER));
      expect(functionsService.createFunction).toHaveBeenCalled();
    });

    it('a VIEWER may NOT create a function', async () => {
      const { controller, functionsService } = makeController('viewer');
      await expect(
        controller.createFunction(PROJECT, { name: 'fn', runtime: 'nodejs' } as any, requestFor(VIEWER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(functionsService.createFunction).not.toHaveBeenCalled();
    });

    it('a DEVELOPER may create a function', async () => {
      const { controller, functionsService } = makeController('developer');
      await controller.createFunction(PROJECT, { name: 'fn', runtime: 'nodejs' } as any, requestFor(DEVELOPER));
      expect(functionsService.createFunction).toHaveBeenCalled();
    });

    it('a VIEWER may NOT edit a function', async () => {
      const { controller, functionsService } = makeController('viewer');
      await expect(
        controller.updateFunction(PROJECT, 'fn-1', {} as any, requestFor(VIEWER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(functionsService.updateFunction).not.toHaveBeenCalled();
    });

    it('a VIEWER may NOT deploy a function', async () => {
      const { controller, functionsService } = makeController('viewer');
      await expect(
        controller.deployFunction(PROJECT, 'fn-1', {} as any, requestFor(VIEWER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(functionsService.deployFunction).not.toHaveBeenCalled();
    });

    it('a VIEWER may NOT invoke a function', async () => {
      const { controller, functionsService } = makeController('viewer');
      await expect(
        controller.invokeFunction(PROJECT, 'fn-1', {} as any, requestFor(VIEWER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(functionsService.invokeFunction).not.toHaveBeenCalled();
    });

    it('a DEVELOPER may NOT delete a function', async () => {
      const { controller, functionsService } = makeController('developer');
      await expect(
        controller.deleteFunction(PROJECT, 'fn-1', requestFor(DEVELOPER)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(functionsService.deleteFunction).not.toHaveBeenCalled();
    });

    it('the owner may delete a function', async () => {
      const { controller, functionsService } = makeController();
      await controller.deleteFunction(PROJECT, 'fn-1', requestFor(OWNER));
      expect(functionsService.deleteFunction).toHaveBeenCalled();
    });
  });

  describe('reading', () => {
    it('a VIEWER sees the variables masked', async () => {
      const { reader, functionsService } = makeController('viewer');
      await reader.listFunctions(PROJECT, requestFor(VIEWER));
      expect(functionsService.listFunctions).toHaveBeenCalledWith(PROJECT, false);
    });

    it('the owner sees the variables', async () => {
      const { reader, functionsService } = makeController();
      await reader.listFunctions(PROJECT, requestFor(OWNER));
      expect(functionsService.listFunctions).toHaveBeenCalledWith(PROJECT, true);
    });

    it('a DEVELOPER sees the variables masked', async () => {
      const { reader, functionsService } = makeController('developer');
      await reader.getFunction(PROJECT, 'fn-1', requestFor(DEVELOPER));
      expect(functionsService.getFunction).toHaveBeenCalledWith(PROJECT, 'fn-1', false);
    });
  });
});
