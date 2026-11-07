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
  return act(projectId, deploymentId, `/projects/${projectId}/deployments/${deploymentId}/stop`);
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
    await api.post(`/projects/${projectId}/deployments/${deploymentId}/rollback`, {
      ...(targetDeploymentId ? { targetDeploymentId } : {}),
    });
    revalidatePath(`/projects/${projectId}/deployments`);
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The rollback could not be started.',
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
      error: err instanceof Error ? err.message : 'The deployment could not be removed.',
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
      error: err instanceof Error ? err.message : 'The setting could not be saved.',
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
      error: err instanceof Error ? err.message : 'The deployment could not be changed.',
    };
  }
}
