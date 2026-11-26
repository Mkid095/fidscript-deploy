import { ProjectsCrudController } from './projects-crud.controller';
import { ForbiddenException } from '@nestjs/common';

/**
 * Who may create a project.
 *
 * A project is owned by a person. A *project* key acts as a project, not a
 * person — it can never create one. An *account* key acts as its owner, so
 * it may. A live session is the person themselves.
 */

function make() {
  const projects = { create: jest.fn().mockResolvedValue({ id: 'new-project' }) };
  const controller = new ProjectsCrudController(projects as any);
  return { controller, projects };
}

describe('project creation, by credential kind', () => {
  it('lets a live session (a person) create', async () => {
    const { controller, projects } = make();
    await controller.create({ user: { userId: 'u1', isApiKey: false } } as any, { name: 'x' } as any);
    expect(projects.create).toHaveBeenCalledWith('u1', { name: 'x' });
  });

  it('lets an account key create, as its owner', async () => {
    const { controller, projects } = make();
    await controller.create(
      { user: { userId: 'u1', isApiKey: true, keyType: 'account', keyPermissions: [] } } as any,
      { name: 'x' } as any,
    );
    expect(projects.create).toHaveBeenCalledWith('u1', { name: 'x' });
  });

  it('refuses a project key — it acts as a project, not a person', async () => {
    const { controller, projects } = make();
    await expect(
      controller.create(
        {
          user: { userId: 'api-key', projectId: 'p1', isApiKey: true, keyType: 'project' },
        } as any,
        { name: 'x' } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(projects.create).not.toHaveBeenCalled();
  });
});
