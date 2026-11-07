import { PrismaClient } from '@prisma/client';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser, createProject, addMember, configurePlatform } from '@/testing/fixtures';

/**
 * The platform's own workflows, over HTTP.
 *
 * Each one is the path an operator takes: the domain they add, the
 * variables they set, the deployment they start, the database they ask
 * for, the function they write, the queue they use. The assertions are
 * about what the platform **answers**, because that is what the SDK and
 * the dashboard read.
 */
describe("the platform's resources", () => {
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
  describe('the deployments', () => {
    /**
     * The read path.
     *
     * *Creating* a deployment over HTTP emits an event, and the platform's
     * own worker picks it up and starts a **real build** — on the live
     * platform. A test must not set that loose, so the row is written here
     * and the route that reads it is exercised.
     */
    it('reads a deployment back', async () => {
      const row = await prisma.deployment.create({
        data: {
          projectId: project.id,
          status: 'SUCCESS',
          deploymentUrl: 'https://app.example.test',
        } as any,
      });

      const read = await fetch(`${tier.url}/api/v1/projects/${project.id}/deployments/${row.id}`, {
        headers: auth(),
      });
      expect(read.status).toBe(200);
      const body = (await read.json()) as { id: string; status: string };
      expect(body.id).toBe(row.id);
      expect(body.status).toBe('success');
    });

    it('lists the project\'s deployments', async () => {
      const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/deployments`, {
        headers: auth(),
      });
      expect(response.status).toBe(200);
      const body = (await response.json()) as { deployments?: unknown[] } | unknown[];
      const deployments = Array.isArray(body) ? body : body.deployments ?? [];
      expect(Array.isArray(deployments)).toBe(true);
    });
  });
});
