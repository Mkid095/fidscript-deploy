'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The deployment's steps.
 *
 * The build plan comes from the platform — the console does not guess what
 * framework a repository is.
 */
export async function detectBuildPlanAction(
  projectId: string,
  input: { gitUrl: string; branch: string },
): Promise<{ ok?: boolean; plan?: BuildPlan; error?: string }> {
  try {
    const plan = await api.post<BuildPlan>(
      `/projects/${projectId}/deployments/detect`,
      {
        gitUrl: input.gitUrl,
        branch: input.branch || 'main',
      },
    );
    return { ok: true, plan };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The repository could not be read.',
    };
  }
}

export interface BuildPlan {
  framework: string;
  frameworkLabel: string;
  frameworkVersion?: string;
  buildCommand: string;
  startCommand: string;
  outputDirectory: string;
  port: number;
  runtime: string;
  monorepo?: string;
  /** The applications a monorepo holds, when it holds more than one. */
  apps?: Array<{
    path: string;
    name: string;
    framework: string;
    frameworkLabel: string;
  }>;
  detectedAt: string;
}

/** Name the monorepo app this project's deployments build. */
export async function updateBuildTargetAction(
  projectId: string,
  buildTarget: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.patch(`/projects/${projectId}/build-config`, { buildTarget });
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The application could not be set.',
    };
  }
}

/** Start the deployment. */
export async function createDeploymentAction(
  projectId: string,
  input: {
    gitUrl: string;
    branch: string;
    envVars: Record<string, string>;
    subdomain?: string;
    domainId?: string;
  },
): Promise<{ ok?: boolean; deploymentId?: string; error?: string }> {
  try {
    const result = await api.post<{ deployment?: { id: string }; id?: string }>(
      `/projects/${projectId}/deployments`,
      {
        source: {
          type: 'git',
          git: { url: input.gitUrl, branch: input.branch || 'main' },
        },
        branch: input.branch || 'main',
        ...(Object.keys(input.envVars).length > 0
          ? { envVars: input.envVars }
          : {}),
        ...(input.subdomain ? { subdomain: input.subdomain } : {}),
        ...(input.domainId ? { domainId: input.domainId } : {}),
      },
    );
    revalidatePath(`/projects/${projectId}/deployments`);
    const id = result.deployment?.id ?? result.id;
    return id
      ? { ok: true, deploymentId: id }
      : { error: 'The deployment did not start.' };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The deployment could not be started.',
    };
  }
}
