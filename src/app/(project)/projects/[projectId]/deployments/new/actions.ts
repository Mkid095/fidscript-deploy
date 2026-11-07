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
    const plan = await api.post<BuildPlan>(`/projects/${projectId}/deployments/detect`, {
      gitUrl: input.gitUrl,
      branch: input.branch || 'main',
    });
    return { ok: true, plan };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The repository could not be read.',
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
  detectedAt: string;
}

/** Start the deployment. */
export async function createDeploymentAction(
  projectId: string,
  input: {
    gitUrl: string;
    branch: string;
    envVars: Record<string, string>;
    subdomain?: string;
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
        ...(Object.keys(input.envVars).length > 0 ? { envVars: input.envVars } : {}),
        ...(input.subdomain ? { subdomain: input.subdomain } : {}),
      },
    );
    revalidatePath(`/projects/${projectId}/deployments`);
    const id = result.deployment?.id ?? result.id;
    return id ? { ok: true, deploymentId: id } : { error: 'The deployment did not start.' };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The deployment could not be started.',
    };
  }
}
