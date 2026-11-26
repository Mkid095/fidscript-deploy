'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * What can be done to a deployment.
 *
 * Stop it, start it again, roll back to the one before it, or take it
 * away. Every one of them is the platform's — the console asks.
 */

export async function stopDeploymentAction(
  projectId: string,
  deploymentId: string,
): Promise<{ ok?: boolean; error?: string }> {
  return act(
    projectId,
    deploymentId,
    `/projects/${projectId}/deployments/${deploymentId}/stop`,
  );
}

export async function restartDeploymentAction(
  projectId: string,
  deploymentId: string,
): Promise<{ ok?: boolean; error?: string }> {
  return act(
    projectId,
    deploymentId,
    `/projects/${projectId}/deployments/${deploymentId}/restart`,
  );
}

/** Go back to the deployment that was live before this one. */
export async function rollbackDeploymentAction(
  projectId: string,
  deploymentId: string,
  targetDeploymentId?: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(
      `/projects/${projectId}/deployments/${deploymentId}/rollback`,
      {
        ...(targetDeploymentId ? { targetDeploymentId } : {}),
      },
    );
    revalidatePath(`/projects/${projectId}/deployments`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The rollback could not be started.',
    };
  }
}

/** Take the deployment away — the container, the image and the record. */
export async function destroyDeploymentAction(
  projectId: string,
  deploymentId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/deployments/${deploymentId}`);
    revalidatePath(`/projects/${projectId}/deployments`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The deployment could not be removed.',
    };
  }
}

/**
 * Deploy it again.
 *
 * The same source, built again — which is what somebody means when the
 * build was right but the environment was not.
 */
export async function redeployAction(
  projectId: string,
  input: { gitUrl: string; branch: string; subdomain?: string },
): Promise<{ ok?: boolean; deploymentId?: string; error?: string }> {
  if (!input.gitUrl.trim()) {
    return { error: 'The deployment has no source to deploy again.' };
  }

  try {
    const result = await api.post<{ deployment?: { id: string }; id?: string }>(
      `/projects/${projectId}/deployments`,
      {
        source: {
          type: 'git',
          git: {
            url: input.gitUrl,
            branch: input.branch || 'main',
          },
        },
        branch: input.branch || 'main',
        ...(input.subdomain ? { subdomain: input.subdomain } : {}),
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
          : 'The deployment could not be started again.',
    };
  }
}

/** Deploy on every push to the branch. */
export async function setAutoDeployAction(
  projectId: string,
  enabled: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.patch(`/projects/${projectId}/auto-deploy`, { enabled });
    revalidatePath(`/projects/${projectId}/deployments`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The setting could not be saved.',
    };
  }
}

/**
 * Register the GitHub webhook again.
 *
 * For when GitHub lost it — the owner cleaned up hooks, the repo moved,
 * the token was replaced. The platform re-registers it with the owner's
 * own connection; the old registration goes with it.
 */
export async function reconnectWebhookAction(
  projectId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/git-integration/webhook/reconnect`);
    revalidatePath(`/projects/${projectId}/deployments`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The webhook could not be re-registered.',
    };
  }
}

/**
 * The application's ceilings: how much memory and how much CPU its
 * container may claim. The host runs the platform and every project on it,
 * so the values have a floor and a ceiling — the platform's own.
 */
export async function saveBuildResourcesAction(
  projectId: string,
  input: { memoryLimitMb?: number; cpuLimitMillicpu?: number },
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.patch(`/projects/${projectId}/build-config`, {
      ...(input.memoryLimitMb !== undefined && Number.isFinite(input.memoryLimitMb)
        ? { memoryLimitMb: Math.round(input.memoryLimitMb) }
        : {}),
      ...(input.cpuLimitMillicpu !== undefined && Number.isFinite(input.cpuLimitMillicpu)
        ? { cpuLimitMillicpu: Math.round(input.cpuLimitMillicpu) }
        : {}),
    });
    revalidatePath(`/projects/${projectId}/deployments`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The settings could not be saved.',
    };
  }
}

/**
 * Apply the saved settings to what is running **now**: the live container
 * is re-run from the same image under the new ceilings. Not a new version —
 * the envelope changes, the application does not.
 */
export async function applyBuildConfigAction(
  projectId: string,
): Promise<{ ok?: boolean; error?: string; applied?: boolean }> {
  try {
    const result = await api.post<{ success?: boolean; error?: string }>(
      `/projects/${projectId}/deployments/apply-build-config`,
    );
    revalidatePath(`/projects/${projectId}/deployments`);
    if (result && result.success === false) {
      return {
        error:
          result.error ??
          'The application came back up, but not under the new settings.',
      };
    }
    return { ok: true, applied: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The settings could not be applied.',
    };
  }
}

async function act(
  projectId: string,
  deploymentId: string,
  path: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(path);
    revalidatePath(`/projects/${projectId}/deployments`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The deployment could not be changed.',
    };
  }
}
