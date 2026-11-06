import { PrismaClient } from '@prisma/client';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser, createProject, addMember, mintProjectKey, configurePlatform } from '@/testing/fixtures';

/**
 * The authorization rules, against the running platform.
 *
 * These are the Phase 1 fixes, exercised the way a client meets them:
 * over HTTP, with the real guards and the real database. A rule that is
 * only ever tested with a mocked request can pass while the real route
 * lets somebody through.
 */
describe("the platform's roles", () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });
  describe("a project's roles", () => {
    it('lets the owner do everything', async () => {
      const owner = await createUser(prisma);
      const project = await createProject(prisma, owner.id);
      const token = await signIn(tier.url, owner.email, owner.password);

      const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'a-key' }),
      });
      expect(response.status).toBe(201);
    });

    it('refuses a viewer the administrator operations', async () => {
      const owner = await createUser(prisma);
      const viewer = await createUser(prisma);
      const project = await createProject(prisma, owner.id);
      await addMember(prisma, project.id, viewer.id, 'viewer');
      const token = await signIn(tier.url, viewer.email, viewer.password);

      // Reading is allowed.
      const read = await fetch(`${tier.url}/api/v1/projects/${project.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(read.status).toBe(200);

      // Writing an administrator's key is not.
      const write = await fetch(`${tier.url}/api/v1/projects/${project.id}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'a-key' }),
      });
      expect(write.status).toBe(403);
    });

    it('refuses a developer the environment variables — they are an administrator\'s', async () => {
      const owner = await createUser(prisma);
      const developer = await createUser(prisma);
      const admin = await createUser(prisma);
      const project = await createProject(prisma, owner.id);
      await addMember(prisma, project.id, developer.id, 'developer');
      await addMember(prisma, project.id, admin.id, 'admin');
      const developerToken = await signIn(tier.url, developer.email, developer.password);
      const adminToken = await signIn(tier.url, admin.email, admin.password);

      const body = JSON.stringify({ envVars: [{ key: 'DATABASE_URL', value: 'postgres://x' }] });

      const byDeveloper = await fetch(`${tier.url}/api/v1/projects/${project.id}/env-vars`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${developerToken}` },
        body,
      });
      expect(byDeveloper.status).toBe(403);

      const byAdmin = await fetch(`${tier.url}/api/v1/projects/${project.id}/env-vars`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body,
      });
      expect(byAdmin.status).toBe(200);

      const remove = await fetch(`${tier.url}/api/v1/projects/${project.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${developerToken}` },
      });
      expect(remove.status).toBe(403);
    });

    it('refuses a person who is not a member at all', async () => {
      const owner = await createUser(prisma);
      const stranger = await createUser(prisma);
      const project = await createProject(prisma, owner.id);
      const token = await signIn(tier.url, stranger.email, stranger.password);

      const response = await fetch(`${tier.url}/api/v1/projects/${project.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status).toBe(403);
    });
  });
});
