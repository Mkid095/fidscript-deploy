import { PrismaClient } from '@prisma/client';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser, createProject, addMember, configurePlatform } from '@/testing/fixtures';

/**
 * The databases and the functions — the resources an operator asks the
 * platform for.
 */
describe("the platform's data", () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;
  let owner: { id: string; email: string; password: string };
  let project: { id: string; slug: string };
  let token: string;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
    owner = await createUser(prisma);
    project = await createProject(prisma, owner.id);
    token = await signIn(tier.url, owner.email, owner.password);
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
  describe('the databases', () => {
    /**
     * The read path.
     *
     * *Creating* a database provisions a real PostgreSQL database and a
     * role in the platform's cluster — it needs the platform's admin
     * credentials and it leaves objects behind, so it is a live check
     * rather than a test. What the SDK and the dashboard read is the row,
     * and that is what is exercised here.
     */
    it('reads a database back', async () => {
      const row = await prisma.managedDatabase.create({
        data: {
          projectId: project.id,
          name: 'app-db',
          type: 'postgresql',
          version: '16',
          environment: 'production',
          status: 'READY',
        },
      } as any);

      const read = await fetch(`${tier.url}/api/v1/projects/${project.id}/databases/${row.id}`, {
        headers: auth(),
      });
      expect(read.status).toBe(200);
      const body = (await read.json()) as { id: string; name: string };
      expect(body.id).toBe(row.id);
      expect(body.name).toBe('app-db');
    });

    it('refuses a database of another project', async () => {
      const owner = await createUser(prisma);
      const theirs = await createProject(prisma, owner.id);
      const row = await prisma.managedDatabase.create({
        data: {
          projectId: theirs.id,
          name: 'private-db',
          type: 'postgresql',
          version: '16',
          environment: 'production',
          status: 'READY',
        },
      } as any);

      const read = await fetch(`${tier.url}/api/v1/projects/${project.id}/databases/${row.id}`, {
        headers: auth(),
      });
      expect(read.status).toBe(404);
    });
  });

  describe('the functions', () => {
    it('keeps the function\'s variables secret from a viewer', async () => {
      const viewer = await createUser(prisma);
      await addMember(prisma, project.id, viewer.id, 'viewer');
      const viewerToken = await signIn(tier.url, viewer.email, viewer.password);

      const created = await fetch(`${tier.url}/api/v1/projects/${project.id}/functions`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({
          name: 'probe',
          runtime: 'nodejs',
          envVars: { OPENAI_API_KEY: 'sk-live-SECRET' },
        }),
      });
      expect(created.status).toBe(201);

      const body = (await created.json()) as { id: string };
      const id = body.id;

      // The database holds the secret encrypted.
      const stored = await prisma.function.findUnique({ where: { id } });
      expect(JSON.stringify(stored?.envVars)).not.toContain('sk-live-SECRET');

      // The owner sees it.
      const asOwner = await fetch(`${tier.url}/api/v1/projects/${project.id}/functions/${id}`, {
        headers: auth(),
      });
      const ownerBody = (await asOwner.json()) as { envVars: Record<string, string> };
      expect(ownerBody.envVars.OPENAI_API_KEY).toBe('sk-live-SECRET');

      // A viewer does not.
      const asViewer = await fetch(`${tier.url}/api/v1/projects/${project.id}/functions/${id}`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const viewerBody = (await asViewer.json()) as { envVars: Record<string, string> };
      expect(viewerBody.envVars.OPENAI_API_KEY).toBe('[masked]');
    });
  });

  describe('the queues', () => {
    it('creates a queue and lists it', async () => {
      const created = await fetch(`${tier.url}/api/v1/projects/${project.id}/queues`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ name: 'work', type: 'stream' }),
      });
      expect([200, 201]).toContain(created.status);

      const list = await fetch(`${tier.url}/api/v1/projects/${project.id}/queues`, {
        headers: auth(),
      });
      expect(list.status).toBe(200);
    });
  });
});
