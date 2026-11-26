import { DeploymentApplyService } from './deployment-apply.service';

/**
 * Applying the settings to what is running.
 *
 * The live container is re-run from the same image under the project's
 * current ceilings: not a new version, a new envelope.
 */
describe('applying the build config to the live container', () => {
  function makeService(overrides: {
    settings?: unknown;
    activeDeployment?: unknown;
    buildConfig?: unknown;
    redeploy?: (opts: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }) {
    const seen: Record<string, Record<string, unknown>> = {};
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project-1',
          slug: 'soostori',
          type: 'NODE',
        }),
      },
      projectSettings: {
        findUnique: jest.fn().mockResolvedValue(overrides.settings ?? null),
      },
      deployment: {
        findUnique: jest.fn().mockResolvedValue(overrides.activeDeployment ?? null),
        update: jest.fn().mockResolvedValue({}),
      },
      buildConfig: {
        findUnique: jest.fn().mockResolvedValue(overrides.buildConfig ?? null),
      },
      projectEnv: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const cryptoService = { decrypt: (v: string) => v };
    const buildRunner = {
      redeployExistingImage: jest.fn(async (opts: Record<string, unknown>) => {
        seen.redeploy = opts;
        if (overrides.redeploy) return overrides.redeploy(opts);
        return {
          containerId: 'fidscript-soostori-' + (opts.deploymentId as string),
          deploymentUrl: 'https://soostori.apps.fidscript.com',
          success: true,
        };
      }),
    };
    const service = new DeploymentApplyService(
      prisma as never,
      buildRunner as never,
      cryptoService as never,
    );
    return { service, seen, buildRunner, prisma };
  }

  it('says plainly when there is nothing running to apply to', async () => {
    const { service } = makeService({});
    await expect(service.applyBuildConfig('project-1')).rejects.toThrow(
      /Nothing is running yet/,
    );
  });

  it('re-runs the live image under the saved ceilings', async () => {
    const { service, seen } = makeService({
      settings: { activeDeploymentId: 'deployment-live' },
      activeDeployment: {
        id: 'deployment-live',
        release: { imageTag: 'fidscript/soostori:v4', runtimePort: 3000 },
      },
      buildConfig: {
        memoryLimitMb: 1024,
        cpuLimitMillicpu: 2000,
        startupTimeoutSeconds: 90,
      },
    });

    const result = await service.applyBuildConfig('project-1');

    expect(result.success).toBe(true);
    expect(result.memoryLimitMb).toBe(1024);
    expect(result.cpuLimitMillicpu).toBe(2000);
    const opts = seen.redeploy;
    expect(opts.imageTag).toBe('fidscript/soostori:v4');
    expect(opts.deploymentId).toBe('deployment-live');
    expect(opts.memoryLimitMb).toBe(1024);
    expect(opts.cpuLimitMillicpu).toBe(2000);
    expect(opts.port).toBe(3000);
  });

  it('falls back to the platform defaults when the project set nothing', async () => {
    const { service, seen } = makeService({
      settings: { activeDeploymentId: 'deployment-live' },
      activeDeployment: {
        id: 'deployment-live',
        release: { imageTag: 'fidscript/soostori:v4' },
      },
      buildConfig: null,
    });

    const result = await service.applyBuildConfig('project-1');
    expect(result.memoryLimitMb).toBe(512);
    expect(result.cpuLimitMillicpu).toBe(1000);
    // The platform defaults are passed through explicitly, so the runner
    // never has to guess.
    expect(seen.redeploy.memoryLimitMb).toBe(512);
    expect(seen.redeploy.cpuLimitMillicpu).toBe(1000);
  });

  it('marks the deployment failed when the re-run does not come up', async () => {
    const { service, prisma } = makeService({
      settings: { activeDeploymentId: 'deployment-live' },
      activeDeployment: {
        id: 'deployment-live',
        release: { imageTag: 'fidscript/soostori:v4' },
      },
      redeploy: () =>
        Promise.resolve({
          containerId: 'fidscript-soostori-deployment-live',
          success: false,
          error: 'the container will not start',
        }),
    });

    const result = await service.applyBuildConfig('project-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('the container will not start');
    expect(prisma.deployment.update).toHaveBeenCalledWith({
      where: { id: 'deployment-live' },
      data: { status: 'FAILED' },
    });
  });
});
