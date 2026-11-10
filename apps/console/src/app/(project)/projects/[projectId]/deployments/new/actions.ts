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
  /** The dependency install the plan runs, when the repository names one. */
  installCommand?: string;
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
  /** The variables the repository's own .env.example asks for. */
  envSuggestions?: string[];
  detectedAt: string;
}

/** Name the monorepo app this project's deployments build. */
export async function updateBuildTargetAction(
  projectId: string,
  buildTarget: string,
): Promise<{ ok?: boolean; error?: string }> {
  return updateBuildConfigAction(projectId, { buildTarget });
}

/**
 * The build's own settings — the monorepo app, and the commands and the
 * port a deployment runs when the person overrides what was detected. An
 * absent or empty command means "what the repository says".
 */
export async function updateBuildConfigAction(
  projectId: string,
  input: {
    buildTarget?: string;
    installCommand?: string;
    buildCommand?: string;
    startCommand?: string;
    port?: number;
  },
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.patch(`/projects/${projectId}/build-config`, {
      ...(input.buildTarget !== undefined ? { buildTarget: input.buildTarget } : {}),
      ...(input.installCommand !== undefined ? { installCommand: input.installCommand } : {}),
      ...(input.buildCommand !== undefined ? { buildCommand: input.buildCommand } : {}),
      ...(input.startCommand !== undefined ? { startCommand: input.startCommand } : {}),
      ...(input.port !== undefined ? { port: input.port } : {}),
    });
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

/**
 * Whether a subdomain of the platform's application zone is free. The
 * platform answers — reserved names, names already in use, and names that
 * do not read as a hostname all say why they are not.
 */
export async function checkSubdomainAvailableAction(
  projectId: string,
  subdomain: string,
): Promise<{ available: boolean; reason?: string }> {
  if (!subdomain.trim()) return { available: true };
  try {
    return await api.get<{ available: boolean; reason?: string }>(
      `/projects/${projectId}/deployments/subdomain-available`,
      { sub: subdomain.trim().toLowerCase() },
    );
  } catch (err) {
    return {
      available: false,
      reason:
        err instanceof Error
          ? err.message
          : 'The name could not be checked.',
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
