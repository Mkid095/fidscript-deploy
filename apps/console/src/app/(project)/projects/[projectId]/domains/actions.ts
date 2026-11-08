'use server';

import { revalidatePath } from 'next/cache';

import { serverApi as api } from '@/lib/api/server';

/**
 * The project's DNS.
 *
 * Connecting an account, adding a domain, and letting the platform write
 * the records. All of it is the platform's — the console asks, and says
 * plainly when it cannot.
 */

/**
 * Connect the account that holds the domain.
 *
 * The token is checked against the provider before it is stored: a token
 * that cannot see the zones is refused, so the connection never pretends.
 */
export async function connectDnsProviderAction(
  projectId: string,
  apiToken: string,
): Promise<{ ok?: boolean; email?: string; error?: string }> {
  const token = apiToken.trim();
  if (!token) return { error: 'The API token is needed.' };

  try {
    const response = await api.post<{ success: boolean; email: string }>(
      `/projects/${projectId}/domains/connect-cloudflare`,
      { apiToken: token },
    );
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true, email: response.email };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The account could not be connected. The token may be wrong, or it may not have the permissions to read and edit DNS.',
    };
  }
}

/** Let the DNS account go. The token goes with it. */
export async function disconnectDnsProviderAction(
  projectId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.delete(`/projects/${projectId}/domains/connection`);
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The account could not be disconnected.',
    };
  }
}

/**
 * Add a domain.
 *
 * `mode` is `auto` when the platform is to write the records itself, and
 * `manual` when the person will do it.
 */
export async function addDomainAction(
  projectId: string,
  input: { domain: string; type: string[]; mode: 'auto' | 'manual' },
): Promise<{ ok?: boolean; domainId?: string; error?: string }> {
  const domain = input.domain.trim().toLowerCase();
  if (!domain) return { error: 'A domain needs a name.' };

  try {
    const response = await api.post<{ domain: { id: string } }>(
      `/projects/${projectId}/domains`,
      {
        domain,
        type: input.type,
        dnsMode: input.mode === 'auto' ? 'cloudflare_auto' : 'manual',
        sslEnabled: true,
      },
    );
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true, domainId: response.domain.id };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The domain could not be added.',
    };
  }
}

/**
 * Let the platform write the records.
 *
 * When the account does not hold the domain, the platform says so — and
 * the console says it too, rather than reporting a failure.
 */
export async function autoConfigureDnsAction(
  projectId: string,
  domainId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(
      `/projects/${projectId}/domains/${domainId}/dns-records/auto-configure`,
    );
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The records could not be written. Is the domain in the connected account?',
    };
  }
}

/** Check a domain's records and say which ones are right. */
export async function verifyDomainAction(
  projectId: string,
  domainId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await api.post(`/projects/${projectId}/domains/${domainId}/verify`);
    revalidatePath(`/projects/${projectId}/domains`);
    return { ok: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'The domain could not be checked.',
    };
  }
}
