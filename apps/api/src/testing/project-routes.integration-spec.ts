import { PrismaClient } from '@prisma/client';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser, createProject, configurePlatform } from '@/testing/fixtures';

/**
 * A project, named by its slug.
 *
 * The dashboard's project console addresses a project by its **slug** — that
 * is what the address carries — while the services behind the guard work
 * with its **id**. Every project-scoped route used to look the project up by
 * id alone, so opening a project from the list and asking for its
 * deployments answered 404, and updating it by slug did the same.
 */
describe('a project, named by its slug', () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
    await configurePlatform(prisma);
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });

  it('is read, listed and written by its slug', async () => {
    const owner = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    const token = await signIn(tier.url, owner.email, owner.password);
    const auth = { Authorization: `Bearer ${token}` };

    const read = await fetch(`${tier.url}/api/v1/projects/${project.slug}`, { headers: auth });
    expect(read.status).toBe(200);
    expect(((await read.json()) as { id: string }).id).toBe(project.id);

    const deployments = await fetch(`${tier.url}/api/v1/projects/${project.slug}/deployments`, {
      headers: auth,
    });
    expect(deployments.status).toBe(200);

    const envVars = await fetch(`${tier.url}/api/v1/projects/${project.slug}/env-vars`, {
      headers: auth,
    });
    expect(envVars.status).toBe(200);

    const renamed = await fetch(`${tier.url}/api/v1/projects/${project.slug}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed by its slug' }),
    });
    expect(renamed.status).toBe(200);
    expect(((await renamed.json()) as { name: string }).name).toBe('Renamed by its slug');
  });

  it('is still the only project the caller may reach', async () => {
    const owner = await createUser(prisma);
    const stranger = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    const token = await signIn(tier.url, stranger.email, stranger.password);

    const response = await fetch(`${tier.url}/api/v1/projects/${project.slug}/deployments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(403);
  });
});
