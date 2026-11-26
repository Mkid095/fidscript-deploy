import { execSync } from 'child_process';
import { DeploymentHealthChecker } from './deployment.checker';
import type { Project } from '@prisma/client';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execSync: jest.fn(),
}));

const project = { id: 'p1', slug: 'soostori', deploymentOn: true } as unknown as Project;
const projectOff = { id: 'p2', slug: 'soostori', deploymentOn: false } as unknown as Project;

function make(latest: unknown) {
  const prisma: any = {
    deployment: { findFirst: jest.fn().mockResolvedValue(latest) },
  };
  return new DeploymentHealthChecker(prisma);
}

function dockerReply(status: string) {
  (execSync as unknown as jest.Mock).mockImplementation((cmd: string) => {
    expect(cmd).toContain("docker inspect -f '{{.State.Status}}'");
    expect(cmd).toContain(`fidscript-soostori-${'abcd1234'}`);
    return status;
  });
}

function deployment(status: string, extra: Record<string, unknown> = {}) {
  return { id: 'abcd1234', status, createdAt: new Date(), ...extra };
}

describe('deployment health', () => {
  it('is not configured when deployments are switched off', async () => {
    const h = await make(null).check(projectOff);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
  });

  it('is not configured when no deployment has run yet', async () => {
    const h = await make(null).check(project);
    expect(h.state).toBe('not_configured');
    expect(h.configured).toBe(false);
  });

  it('is unknown while a deployment is in flight', async () => {
    const h = await make(deployment('BUILDING')).check(project);
    expect(h.state).toBe('unknown');
  });

  it('reports a stopped deployment as degraded, not healthy', async () => {
    const h = await make(deployment('STOPPED')).check(project);
    expect(h.state).toBe('degraded');
    expect(h.reason).toMatch(/stopped/i);
  });

  it('reports a failed deployment as unhealthy', async () => {
    const h = await make(deployment('FAILED')).check(project);
    expect(h.state).toBe('unhealthy');
  });

  it('is healthy when the live deployment’s container is running', async () => {
    dockerReply('running');
    const h = await make(deployment('SUCCESS')).check(project);
    expect(h.state).toBe('healthy');
  });

  it('is unhealthy when the live deployment lost its container', async () => {
    (execSync as unknown as jest.Mock).mockImplementation(() => {
      const err: any = new Error('no such object');
      err.stderr = Buffer.from('Error: No such object: fidscript-soostori-abcd1234');
      throw err;
    });
    const h = await make(deployment('SUCCESS')).check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/no longer has a running container/i);
  });

  it('is unhealthy when the container has exited', async () => {
    dockerReply('exited');
    const h = await make(deployment('SUCCESS')).check(project);
    expect(h.state).toBe('unhealthy');
    expect(h.reason).toMatch(/exited/);
  });

  it('is unknown when Docker itself cannot be asked — a probe failure, never healthy', async () => {
    (execSync as unknown as jest.Mock).mockImplementation(() => {
      const err: any = new Error('docker: cannot connect');
      err.stderr = Buffer.from('Cannot connect to the Docker daemon');
      throw err;
    });
    const h = await make(deployment('SUCCESS')).check(project);
    expect(h.state).toBe('unknown');
    expect(h.configured).toBe(true);
  });
});
