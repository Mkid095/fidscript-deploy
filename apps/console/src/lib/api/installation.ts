import 'server-only';

import { serverApi as api } from './server';

/**
 * The installation.
 *
 * What the server knows about itself, what would block the setup, and the
 * configure call that writes the platform's domain, its routing and its
 * administrator.
 */

export interface Discovery {
  serverIp: string;
  adminEmail: string | null;
  lifecycle: string;
  dockerAvailable: boolean;
  traefikConfigured: boolean;
  cloudflareTokenFound: boolean;
  cloudflareOAuthConfigured: boolean;
  existingCertificateFound: boolean;
  existingInstallation: { version: string; projectCount: number; userCount: number } | null;
}

export interface StepValidation {
  step: string;
  valid: boolean;
  issues: string[];
}

export interface InstallationStatus {
  lifecycle: string;
  platformDomain: string;
  authMethod: string;
  platformName?: string;
}

/** What does this server already know about itself? */
export async function discover(): Promise<Discovery | null> {
  return api.get<Discovery>('/installation/discover').catch(() => null);
}

/** What would block the configuration? */
export async function validateInstallation(): Promise<StepValidation[]> {
  const response = await api
    .get<{ validations: StepValidation[] }>('/installation/validate')
    .catch(() => ({ validations: [] as StepValidation[] }));
  return response.validations;
}

/** Where the platform stands. */
export async function installationStatus(): Promise<InstallationStatus | null> {
  return api.get<InstallationStatus>('/installation/status').catch(() => null);
}

/**
 * Configure the platform.
 *
 * The setup token goes in a header and never in the body — it is the one
 * thing that lets a caller write the platform's administrator.
 */
export async function configureInstallation(
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
): Promise<{ operationId?: string; error?: string }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  try {
    const response = await fetch(`${API_URL}/api/v1/installation/configure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-setup-token': setupToken,
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    });

    const text = await response.text();
    if (!response.ok) {
      let message = 'The platform could not be configured.';
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // The answer was not JSON — the message above stands.
      }
      return { error: message };
    }

    const parsed = JSON.parse(text) as { operationId: string };
    return { operationId: parsed.operationId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The platform could not be configured.',
    };
  }
}

/** The installs that are running, and the ones that just finished. */
export async function listInstalls(): Promise<
  Array<{ id: string; applicationId: string; status: string; error?: string | null }>
> {
  const response = await api
    .get<{
      installs: Array<{ id: string; applicationId: string; status: string; error?: string | null }>;
    }>('/applications/installs')
    .catch(() => ({ installs: [] as Array<{ id: string; applicationId: string; status: string }> }));
  return response.installs;
}
