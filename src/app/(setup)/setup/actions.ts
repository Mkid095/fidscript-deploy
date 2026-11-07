'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';
import { configureInstallation } from '@/lib/api/installation';

/**
 * The setup.
 *
 * Two acts: configuring the platform itself, and installing one of the
 * applications it is made of. Both are the platform's — the console asks.
 */

/**
 * Configure the platform.
 *
 * The setup token is the installer’s: it was printed once, and the operator
 * types it here. It goes to the API in a header, and it is never stored.
 */
export async function configurePlatformAction(
  input: {
    platformName: string;
    platformDomain: string;
    serverIp: string;
    adminEmail: string;
    authMethod: 'PASSWORD' | 'MAGIC_CODE';
    adminPassword?: string;
    setupPassword?: string;
    cloudflareApiToken?: string;
    dnsMode?: string;
  },
  setupToken: string,
): Promise<{ ok?: boolean; operationId?: string; error?: string }> {
  if (!setupToken.trim()) return { error: 'The setup token is needed.' };

  const result = await configureInstallation(input, setupToken.trim());
  if (result.error) return { error: result.error };

  revalidatePath('/setup');
  return { ok: true, operationId: result.operationId };
}

/** Install one application. */
export async function installApplicationAction(
  applicationId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/applications/${applicationId}/install`);
    revalidatePath('/setup');
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The application could not be installed.',
    };
  }
}
