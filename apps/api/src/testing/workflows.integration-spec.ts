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
describe("the platform's workflows", () => {
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
  describe('the email domains', () => {
    it('answers the create with the domain AND the DNS steps', async () => {
      const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/email/domains`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ domain: 'mail.example.test' }),
      });
      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        domain: { id: string; domain: string; status: string };
        ownershipToken: string;
        steps: string[];
      };
      // The envelope the dashboard used to cast to a row — and the steps it
      // used to throw away.
      expect(body.domain.id).toBeTruthy();
      expect(body.domain.domain).toBe('mail.example.test');
      expect(body.ownershipToken).toBeTruthy();
      expect(body.steps.length).toBeGreaterThan(0);
    });

    it('answers the list with the list itself — not an object around it', async () => {
      const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/email/domains`, {
        headers: auth(),
      });
      expect(response.status).toBe(200);

      const body = (await response.json()) as Array<{ domain: string }>;
      // The SDK unwrapped `{ domains }` and the API never sent it, so every
      // list came back empty.
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((d) => d.domain === 'mail.example.test')).toBe(true);
    });

    it('refuses a domain that is already registered', async () => {
      const response = await fetch(`${tier.url}/api/v1/projects/${project.id}/email/domains`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ domain: 'mail.example.test' }),
      });
      expect(response.status).toBe(400);
    });

    it('removes a domain', async () => {
      const created = await fetch(`${tier.url}/api/v1/projects/${project.id}/email/domains`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ domain: 'gone.example.test' }),
      });
      const { domain } = (await created.json()) as { domain: { id: string } };

      const removed = await fetch(`${tier.url}/api/v1/projects/${project.id}/email/domains/${domain.id}`, {
        method: 'DELETE',
        headers: auth(),
      });
      expect(removed.status).toBe(200);

      const list = await fetch(`${tier.url}/api/v1/projects/${project.id}/email/domains`, {
        headers: auth(),
      });
      const body = (await list.json()) as Array<{ domain: string }>;
      expect(body.some((d) => d.domain === 'gone.example.test')).toBe(false);
    });
  });

  describe('the environment variables', () => {
    it('shows the value to an administrator and hides it from a developer', async () => {
      const developer = await createUser(prisma);
      await addMember(prisma, project.id, developer.id, 'developer');
      const developerToken = await signIn(tier.url, developer.email, developer.password);

      const write = await fetch(`${tier.url}/api/v1/projects/${project.id}/env-vars`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ envVars: [{ key: 'DATABASE_URL', value: 'postgres://secret' }] }),
      });
      expect(write.status).toBe(200);

      const asOwner = await fetch(`${tier.url}/api/v1/projects/${project.id}/env-vars`, {
        headers: auth(),
      });
      const ownerVars = (await asOwner.json()) as { envVars: Array<{ key: string; value: string }> };
      expect(ownerVars.envVars.find((v) => v.key === 'DATABASE_URL')?.value).toBe('postgres://secret');

      const asDeveloper = await fetch(`${tier.url}/api/v1/projects/${project.id}/env-vars`, {
        headers: { Authorization: `Bearer ${developerToken}` },
      });
      const developerVars = (await asDeveloper.json()) as { envVars: Array<{ key: string; value: string }> };
      expect(developerVars.envVars.find((v) => v.key === 'DATABASE_URL')?.value).toBe('[masked]');
    });
  });
});
