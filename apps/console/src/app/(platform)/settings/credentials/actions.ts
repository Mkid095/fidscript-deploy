'use server';

import {
  applyPlatformCredentials,
  verifyPlatformCredentials,
} from '@/lib/api/platform';

/**
 * The credentials' actions: check a candidate password against every
 * application, and apply the platform's identity where an application
 * takes it from the platform. Both are the platform's own answers — the
 * console says plainly when an application cannot be reached.
 */

export async function verifyCredentialsAction(
  email: string,
  password: string,
): Promise<{
  results?: Array<{ id: string; opens: boolean | null; detail?: string }>;
  error?: string;
}> {
  if (!password) return { error: 'The password is needed.' };
  try {
    const response = await verifyPlatformCredentials(email, password);
    return { results: response.results };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'The check could not be run.',
    };
  }
}

export async function applyCredentialsAction(
  email: string,
  password: string,
): Promise<{
  results?: Array<{ id: string; applied: boolean | 'manual'; detail?: string }>;
  error?: string;
}> {
  if (!email) return { error: 'The email is needed.' };
  if (!password) return { error: 'The password is needed.' };
  try {
    const response = await applyPlatformCredentials(email, password);
    return { results: response.results };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'The identity could not be applied.',
    };
  }
}
