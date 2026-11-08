'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The setup.
 *
 * The platform is written by the API — the domain, the administrator, the
 * DNS and the certificate — and the console asks for it.
 */
export async function configurePlatformAction(
  input: {
    platformName: string;
    platformDomain: string;
    serverIp: string;
    adminEmail: string;
    authMethod: 'PASSWORD' | 'MAGIC_CODE';
    adminPassword?: string;
    cloudflareApiToken?: string;
    dnsMode?: string;
  },
  setupToken: string,
): Promise<{ ok?: boolean; operationId?: string; error?: string }> {
  if (!setupToken.trim()) return { error: 'The setup token is needed.' };
  if (!input.platformDomain.trim()) return { error: 'The domain is needed.' };

  try {
    const response = await api.post<{ operationId: string }>(
      '/installation/configure',
      {
        platformName: input.platformName,
        platformDomain: input.platformDomain.trim().toLowerCase(),
        serverIp: input.serverIp,
        adminEmail: input.adminEmail.trim(),
        authMethod: input.authMethod,
        ...(input.adminPassword ? { adminPassword: input.adminPassword } : {}),
        ...(input.cloudflareApiToken
          ? { cloudflareApiToken: input.cloudflareApiToken }
          : {}),
        ...(input.dnsMode ? { dnsMode: input.dnsMode } : {}),
      },
      { 'x-setup-token': setupToken.trim() },
    );

    revalidatePath('/setup');
    return { ok: true, operationId: response.operationId };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The platform could not be configured. The setup token may be wrong.',
    };
  }
}

/** Install one of the applications. */
export async function installApplicationAction(
  applicationId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/applications/${applicationId}/install`);
    revalidatePath('/setup');
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The application could not be installed.',
    };
  }
}
