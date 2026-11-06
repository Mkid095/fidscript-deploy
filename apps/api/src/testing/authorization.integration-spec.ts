import { PrismaClient } from '@prisma/client';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser, createProject, mintProjectKey } from '@/testing/fixtures';

/**
 * A project API key, against the running platform.
 *
 * The key is the platform's own credential for a project: it may reach that
 * project and nothing else, and it may do what its scopes say and nothing
 * else. Both rules were broken, and both are exercised here over HTTP with
 * the real guards.
 */
describe('a project API key', () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });

  it('reaches its own project', async () => {
    const owner = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    const key = await mintProjectKey(prisma, project.id, { permissions: ['projects:read'] });

    const response = await fetch(`${tier.url}/api/v1/projects/${project.id}`, {
      headers: { 'X-API-Key': key.key },
    });
    expect(response.status).toBe(200);
  });

  it('is refused another project', async () => {
    const owner = await createUser(prisma);
    const mine = await createProject(prisma, owner.id);
    const theirs = await createProject(prisma, owner.id);
    const key = await mintProjectKey(prisma, mine.id, { permissions: ['projects:read'] });

    const response = await fetch(`${tier.url}/api/v1/projects/${theirs.id}`, {
      headers: { 'X-API-Key': key.key },
    });
    expect(response.status).toBe(403);
  });

  it('is refused the scopes it does not carry', async () => {
    const owner = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    const key = await mintProjectKey(prisma, project.id, { permissions: ['functions:read'] });

    // The environment variables ask for `envvars:read` — the key does not
    // carry it, and the names of a project's variables are half a secret.
    const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/env-vars`, {
      headers: { 'X-API-Key': key.key },
    });
    expect(response.status).toBe(403);
  });

  it('reaches what its scopes do carry', async () => {
    const owner = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    const key = await mintProjectKey(prisma, project.id, { permissions: ['envvars:read'] });

    const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/env-vars`, {
      headers: { 'X-API-Key': key.key },
    });
    expect(response.status).toBe(200);
  });

  it('is refused a write it does not carry', async () => {
    const owner = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    const key = await mintProjectKey(prisma, project.id, { permissions: ['projects:read'] });

    const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key.key },
      body: JSON.stringify({ name: 'a-key' }),
    });
    expect(response.status).toBe(403);
  });
});
