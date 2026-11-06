import { PrismaClient } from '@prisma/client';
import { startIntegrationTier, signIn, type IntegrationTier } from '@/testing/integration';
import { createUser, createProject, addMember, configurePlatform } from '@/testing/fixtures';

/**
 * The platform overview, over HTTP.
 *
 * The overview answers for **the caller's own projects** — the ones they
 * own, the ones they are a member of, and the ones their workspaces own.
 * It must never answer for somebody else's work, and it must never answer
 * for the platform as a whole.
 */
describe('the platform overview', () => {
  let tier: IntegrationTier;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tier = await startIntegrationTier();
    prisma = tier.prisma;
  }, 180000);

  afterAll(async () => {
    await tier.close();
  });

  it('counts the projects the caller can reach', async () => {
    const owner = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    const token = await signIn(tier.url, owner.email, owner.password);

    const response = await fetch(`${tier.url}/api/v1/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      projects: { total: number; byStatus: Record<string, number>; recent: Array<{ id: string }> };
    };
    expect(body.projects.total).toBe(1);
    expect(body.projects.recent[0].id).toBe(project.id);
    expect(Object.values(body.projects.byStatus).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('counts a project the caller is a member of', async () => {
    const owner = await createUser(prisma);
    const member = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    await addMember(prisma, project.id, member.id, 'viewer');
    const token = await signIn(tier.url, member.email, member.password);

    const response = await fetch(`${tier.url}/api/v1/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as { projects: { total: number } };
    expect(body.projects.total).toBe(1);
  });

  it('does not count another person\'s project', async () => {
    const owner = await createUser(prisma);
    const stranger = await createUser(prisma);
    await createProject(prisma, owner.id);
    const token = await signIn(tier.url, stranger.email, stranger.password);

    const response = await fetch(`${tier.url}/api/v1/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as { projects: { total: number } };
    expect(body.projects.total).toBe(0);
  });

  it('reports the deployments and the failures of the caller\'s projects', async () => {
    const owner = await createUser(prisma);
    const project = await createProject(prisma, owner.id);
    await prisma.deployment.create({
      data: { projectId: project.id, status: 'FAILED' },
    });
    await prisma.deployment.create({
      data: { projectId: project.id, status: 'SUCCESS', deploymentUrl: 'https://app.example.test' },
    });
    const token = await signIn(tier.url, owner.email, owner.password);

    const response = await fetch(`${tier.url}/api/v1/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as {
      deployments: { total: number; failed: number; failures: Array<{ status: string }> };
    };
    expect(body.deployments.total).toBe(2);
    expect(body.deployments.failed).toBe(1);
    expect(body.deployments.failures[0].status).toBe('FAILED');
  });

  it('needs a caller', async () => {
    const response = await fetch(`${tier.url}/api/v1/overview`);
    expect(response.status).toBe(401);
  });
});
