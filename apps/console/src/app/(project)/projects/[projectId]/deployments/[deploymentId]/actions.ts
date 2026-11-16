'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The names a deployment answers on.
 *
 * Pointing a domain at the deployment — and taking it off — is the
 * platform's work; the console asks and lets the page be rewritten with
 * what is true now.
 */
export async function attachDomainAction(
  projectId: string,
  deploymentId: string,
  domainId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/domains/${domainId}/attach`, {
      deploymentId,
    });
    revalidatePath(`/projects/${projectId}/deployments/${deploymentId}`);
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The domain could not be pointed at this deployment.',
    };
  }
}

export async function detachDomainAction(
  projectId: string,
  domainId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/domains/${domainId}/attach`, {
      deploymentId: null,
    });
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The domain could not be taken off.',
    };
  }
}
